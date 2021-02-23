<template>
	<div id="global-uploader">
		<uploader
			ref="uploader"
			:options="options"
			:autoStart="false"
			@file-added="filesAdded"
			@files-added="fileArrAdded"
			@file-success="onFileSuccess"
			@file-progress="onFileProgress"
			@file-error="onFileError"
			class="uploader-app"
		>
			<uploader-unsupport></uploader-unsupport>
			<uploader-btn class="global-uploader-btn" :directory="true" :attrs="attrs" ref="uploadBtn">选择文件</uploader-btn>
			<uploader-btn class="global-uploader-btn" :directory="false" :attrs="attrs" ref="uploadBtn-single">选择文件</uploader-btn>
		</uploader>
	</div>
</template>
<script>
import SparkMD5 from 'spark-md5';
import Cookies from 'js-cookie';
import { post } from '@/tools/api/request.js';

export default {
	data() {
		return {
			options: {
				target: '/filetransfer/uploadfile', // 目标上传 URL
				chunkSize: 1024 * 1024,
				fileParameterName: 'file',
				maxChunkRetries: 3,
				testChunks: true, //是否开启服务器分片校验
				// 服务器分片校验函数，秒传及断点续传基础
				checkChunkUploadedByResponse: function(chunk, message) {
					let objMessage = JSON.parse(message);
					let data = objMessage.data;
					if (data.skipUpload) {
						return true;
					}
					return (data.uploaded || []).indexOf(chunk.offset + 1) >= 0;
				},
				headers: {
					token: Cookies.get('token', { domain: '.qiwenshare.com' })
				},
				query() {}
			},
			attrs: {
				accept: '*'
			},
			collapse: false,
			directory: true,
			fileList: [],
			successList: [],
			failList: []
		};
	},
	mounted() {
		this.$EventBus.$on('openUploader', (query, directory) => {
			this.directory = directory;
			if (directory) {
				// 上传文件夹
				this.params = query || {};
				var e = document.createEvent('MouseEvent');
				e.initEvent('click', false, false);
				this.$refs.uploadBtn.$el.dispatchEvent(e);
			} else {
				// 上传文件
				this.params = query || {};
				var e = document.createEvent('MouseEvent');
				e.initEvent('click', false, false);
				this.$refs['uploadBtn-single'].$el.dispatchEvent(e);
			}
		});
	},
	computed: {
		filePath: {
			get() {
				return this.$route.query.filePath;
			},
			set() {
				return '';
			}
		},
		//Uploader实例
		uploader() {
			return this.$refs.uploader.uploader;
		}
	},
	methods: {
		createFile(data) {
			post('/file/createfile', data).then(res => {
				console.log('res', res);
			});
		},
		vtext(params) {},
		fileArrAdded(files, fileList) {},
		// 添加文件的回调
		filesAdded(file) {
			// this.panelShow = true;
			this.computeMD5(file);
		},
		onFileProgress(rootFile, file, chunk) {
			console.log(`上传中 ${file.name}，chunk：${chunk.startByte / 1024 / 1024} ~ ${chunk.endByte / 1024 / 1024}`);
		},
		getDir(pathes) {
			if (pathes.length >= 1) {
				return `${this.filePath}${pathes.join('/')}/`;
			} else {
				return this.filePath;
			}
		},
		// 文件上传成功的回调
		onFileSuccess(rootFile, file, response, chunk) {
			if (response === '') {
				this.statusSet(file.id, 'failed');
				return;
			}
			let data = response.data;

			let result = JSON.parse(response);
			if (result.success) {
				console.log(`${file.relativePath}上传成功`);
				this.$message.success(`${file.relativePath}上传成功`);
				// 新建目录
				let arr = file.relativePath.split('/');
				arr.pop();
				let dir = arr.pop();

				this.successList.push(file.relativePath);
				this.statusRemove(file.id);
				this.$EventBus.$emit('refreshList', '');
				this.$EventBus.$emit('refreshStorage', '');
			} else {
				this.$message.error(result.errorMessage);
				this.statusSet(file.id, 'failed');
				this.failList.push(file.relativePath);
			}
			console.log('成功列表', this.successList);
			console.log('失败列表', this.failList);
		},
		onFileError(rootFile, file, response, chunk) {
			this.$message({
				message: response,
				type: 'error'
			});
		},
		createDir(filePath, dir) {
			let data = {
				fileName: dir,
				filePath: filePath,
				isDir: 1
			};
			return this.createFile(data).then(res => {
				if (res.success) {
					this.$message.success('添加成功');
					this.$emit('getTableDataByType');
					return data;
				} else {
					this.$message.warning(res.errorMessage);
					return Promise.reject(`创建目录${data.fileName}失败`);
				}
			});
		},
		/**
		 * 计算md5，实现断点续传及秒传
		 * @param file
		 */
		computeMD5(file) {
			let fileReader = new FileReader();
			let time = new Date().getTime();
			let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
			let currentChunk = 0;
			const chunkSize = 1 * 1024 * 1024;
			let chunks = Math.ceil(file.size / chunkSize);
			let spark = new SparkMD5.ArrayBuffer();
			// 文件状态设为"计算MD5"
			this.statusSet(file.id, 'md5');
			file.pause();
			loadNext();
			fileReader.onload = e => {
				spark.append(e.target.result);
				if (currentChunk < chunks) {
					currentChunk++;
					loadNext();
					// 实时展示MD5的计算进度
					this.$nextTick(() => {
						console.log(`校验MD5${((currentChunk / chunks) * 100).toFixed(0)}`);
					});
				} else {
					let md5 = spark.end();
					this.computeMD5Success(md5, file);
					console.log(`MD5计算完毕：${file.name} \nMD5：${md5} \n分片：${chunks} 大小:${file.size} 用时：${new Date().getTime() - time} ms`);
				}
			};
			fileReader.onerror = function() {
				this.error(`文件${file.name}读取出错，请检查该文件`);
				file.cancel();
			};
			function loadNext() {
				let start = currentChunk * chunkSize;
				let end = start + chunkSize >= file.size ? file.size : start + chunkSize;
				fileReader.readAsArrayBuffer(blobSlice.call(file.file, start, end));
			}
		},
		computeMD5Success(md5, file) {
			// 将自定义参数直接加载uploader实例的opts上
			Object.assign(this.uploader.opts, {
				query: {
					...this.params
				}
			});
			debugger;
			file.uniqueIdentifier = md5;
			file.resume();
			this.statusRemove(file.id);
		},
		/**
		 * 新增的自定义的状态: 'md5'、'transcoding'、'failed'
		 * @param id
		 * @param status
		 */
		statusSet(id, status) {
			let statusMap = {
				md5: {
					text: '校验MD5',
					bgc: '#fff'
				},
				merging: {
					text: '合并中',
					bgc: '#e2eeff'
				},
				transcoding: {
					text: '转码中',
					bgc: '#e2eeff'
				},
				failed: {
					text: '上传失败',
					bgc: '#e2eeff'
				}
			};
			this.$nextTick(() => {});
		},
		statusRemove(id) {
			this.$nextTick(() => {});
		},
		error(msg) {
			this.$notify({
				title: '错误',
				message: msg,
				type: 'error',
				duration: 2000
			});
		}
	},
	watch: {},
	destroyed() {
		this.$off('openUploader');
	},
	components: {}
};
</script>

<style lang="less" scoped>
#global-uploader {
	position: fixed;
	z-index: 20;
	right: 15px;
	bottom: 15px;

	.uploader-app {
		width: 520px;
	}

	.file-panel {
		background-color: #fff;
		margin-bottom: 10px;
		border: 1px solid #e2e2e2;
		border-radius: 7px 7px 0 0;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);

		.file-title {
			display: flex;
			height: 40px;
			line-height: 40px;
			padding: 0 15px;
			border-bottom: 1px solid #ddd;

			.title-span {
				padding-left: 0;
				margin-bottom: 0;
				font-size: 17px;
				color: #303133;
			}

			.operate {
				flex: 1;
				text-align: right;
			}
		}

		.file-list {
			position: relative;
			height: 240px;
			overflow-x: hidden;
			overflow-y: auto;
			background-color: #fff;

			> li {
				background-color: #fff;
			}

			.list-item {
				padding: 10px;
				background-color: #dc4c3f;
				border-bottom: 1px solid #ddd;
			}
		}

		&.collapse {
			.file-title {
				background-color: #e7ecf2;
			}
		}
	}

	.no-file {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 16px;
	}

	/deep/.uploader-file-icon {
		&:before {
			content: '' !important;
		}

		&[icon='image'] {
			background: url('/assets/images/file/file_pic.png');
		}

		&[icon='video'] {
			background: url('/assets/images/file/file_video.png');
		}

		&[icon='document'] {
			background: url('/assets/images/file/file_txt.png');
		}
	}

	/deep/.uploader-file-actions > span {
		margin-right: 6px;
	}
}

/* 隐藏上传按钮 */
.global-uploader-btn {
	position: absolute;
	clip: rect(0, 0, 0, 0);
}
</style>
