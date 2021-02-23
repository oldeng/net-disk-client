import Disk from '../api/Disk';
import SparkMD5 from 'spark-md5';

let task = 0;

export default {
	needChunkSize: 1048576,
	selectUploadFiles: [],
	uploadHistory: [],
	prepareFile(data, options) {
		let files = data.target.files;
		// 先发送get请求上传文件信息和chunk信息
		this.computeMD5(files[0])
			.then(async ({ md5, file, chunks }) => {
				debugger;
				console.log(md5, file, chunks);
				console.log('计算md5后');
				await Disk.UploadInfo(
					{
						chunkNumber: chunks,
						chunkSize: 1048576,
						currentChunkSize: file.size,
						totalSize: file.size,
						identifier: md5,
						filename: file.name,
						relativePath: file.name,
						totalChunks: 1,
						filePath: '/',
						isDir: 0
					},
					res => {
						// 成功
						console.log('res->', res);
						let data = res.data;
						if (!data.skipUpload) {
							// 上传分片
							this.computeMD5Success(md5, file, chunks);
						} else {
							console.log('秒传成功');
						}
					},
					err => {
						// 失败
						console.log(err);
					}
				);
				// 开始传文件
			})
			.catch(err => {
				console.log(err);
			});
	},
	chunkFileData(item, times) {
		console.log(totalSize > this.needChunkSize);
		let fileName = item.name; //文件名
		let totalSize = item.size; //大小
		let eachSize = totalSize > this.needChunkSize ? item.size / 100 : item.size; //分片大小
		let chunks = totalSize > this.needChunkSize ? Math.ceil(totalSize / eachSize) : 1;
		let chunk = item.chunk || 0;
		chunk = parseInt(chunk, 10); // 上传之前查询是否以及上传过分片
		console.log(chunk, chunks, eachSize, +'abc' + totalSize.toString());

		let isLastChunk = chunk === chunks - 1 ? 1 : 0; // 判断是否为末分片
		if (times === 'first' && isLastChunk === 1 && totalSize > this.needChunkSize) {
			// 如果第一次上传就为末分片，并且不是需要分片的文件即文件已经上传完成，否则重新上传
			chunk = 0;
			isLastChunk = 0;
		}
		// 设置分片的开始结尾
		let blobFrom = chunk * eachSize; // 分段开始
		let blobTo = (chunk + 1) * eachSize > totalSize ? totalSize : (chunk + 1) * eachSize; // 分段结尾
		let fd = new FormData();
		item.chunk = blobTo;
		fd.append('theFile', this.findTheFile(fileName).slice(blobFrom, blobTo)); // 分好段的文件
		fd.append('fileName', fileName); // 文件名
		fd.append('parent_id', item.NowDiskID); // 当前目录id
		fd.append('totalSize', totalSize); // 文件总大小
		fd.append('isLastChunk', isLastChunk); // 是否为末段
		fd.append('isFirstUpload', times === 'first' ? 1 : 0); // 是否是第一段（第一次上传）
		// 上传
		return { fd, chunk };
	},
	postUploadData(item, times, finishCallBack) {
		let data = this.chunkFileData(item, times);
		Disk.Upload(data.fd, rs => {
			if (parseInt(rs.status) === 200) {
				// 上传成功
				if (rs.data) {
					// 已经上传完毕
					this.uploadDone(item, rs, finishCallBack);
				} else {
					item.chunk = ++data.chunk;
					// 这样设置可以暂停，但点击后动态的设置就暂停不了..
					if (item.state === 'progressing') {
						this.postUploadData(item, null, finishCallBack);
					}
				}
			} else {
				item.state = 'interrupted'; //可恢复的上传
			}
		});
	},
	findTheFile(fileName) {
		let files = this.selectUploadFiles,
			theFile;
		for (let i = 0, j = files.length; i < j; ++i) {
			if (files[i].name === fileName) {
				theFile = files[i];
				break;
			}
		}
		return theFile ? theFile : {};
	}, //查找上传的文件
	uploadDone(item, rs, callback) {
		console.log(callback);
		item.chunk = item.size;
		item.state = 'completed';
		for (let i = 0, j = this.selectUploadFiles.length; i < j; ++i) {
			if (this.selectUploadFiles[i].name === item.name) {
				this.selectUploadFiles.splice(i, 1);
				break;
			}
		}
		for (let i = 0, j = this.uploadHistory.length; i < j; ++i) {
			if (this.uploadHistory[i].name === item.name) {
				this.uploadHistory.splice(i, 1);
				break;
			}
		}
		callback(item, rs);
	},
	// 计算文件MD5值
	computeMD5(file) {
		return new Promise((resolve, reject) => {
			let fileReader = new FileReader();
			let time = new Date().getTime();
			let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
			let currentChunk = 0;
			const chunkSize = 1 * 1024 * 1024;
			let chunks = Math.ceil(file.size / chunkSize);
			let spark = new SparkMD5.ArrayBuffer();
			let chunkArr = [];
			// 文件状态设为"计算MD5"
			loadNext();

			fileReader.onload = e => {
				spark.append(e.target.result);
				chunkArr.push(e.target.result);
				if (currentChunk < chunks) {
					currentChunk++;
					loadNext();
					// 实时展示MD5的计算进度
					console.log('校验MD5 ' + ((currentChunk / chunks) * 100).toFixed(0) + '%');
				} else {
					let md5 = spark.end();
					// this.computeMD5Success(md5, file, chunks);
					console.log(`MD5计算完毕：${file.name} \nMD5：${md5} \n分片：${chunks} 大小:${file.size} 用时：${new Date().getTime() - time} ms`);
					fileReader.abort();
					resolve({
						md5,
						file,
						chunks
					});
				}
			};

			fileReader.onerror = function() {
				this.error(`文件${file.name}读取出错，请检查该文件`);
				file.cancel();
				fileReader.abort();
				reject();
			};

			function loadNext() {
				let start = currentChunk * chunkSize;
				let end = start + chunkSize >= file.size ? file.size : start + chunkSize;
				fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
			}
		});
	},
	computeMD5Success(md5, file, chunks) {
		let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
		let currentChunk = 0;
		const chunkSize = 1 * 1024 * 1024;

		function loadNext() {
			let start = currentChunk * chunkSize;
			let end = start + chunkSize >= file.size ? file.size : start + chunkSize;
			return blobSlice.call(file, start, end);
		}
		for (let i = 0; i < chunks; i++) {
			let chunk = loadNext();
			if (currentChunk < chunks) {
				console.log('上传chunk', currentChunk + 1, chunk);
				debugger;
				this.uploadChunk({
					chunkNumber: currentChunk + 1,
					chunkSize: chunkSize,
					currentChunkSize: chunk.size,
					totalSize: file.size,
					identifier: md5,
					filename: file.name,
					relativePath: file.name,
					totalChunks: chunks,
					filePath: '/',
					isDir: 0,
					file: chunk
				})
					.then(() => {
						task--;
						loadNext();
						currentChunk++;
						if (task < 9) {
							chunk = loadNext();
						}
					})
					.catch(err => {
						task--;
						loadNext();
					});
				task++;
			} else {
				fileReader.abort();
			}
		}
	},
	uploadChunk(chunk) {
		return new Promise((resolve, reject) => {
			let form = new FormData();
			form.append('chunkNumber', chunk.chunkNumber);
			form.append('chunkSize', chunk.chunkSize);
			form.append('currentChunkSize', chunk.currentChunkSize);
			form.append('totalSize', chunk.totalSize);
			form.append('identifier', chunk.identifier);
			form.append('filename', chunk.filename);
			form.append('relativePath', chunk.relativePath);
			form.append('totalChunks', chunk.totalChunks);
			form.append('filePath', chunk.filePath);
			form.append('isDir', chunk.isDir);
			form.append('file', chunk.file);
			Disk.Upload(
				form,
				res => {
					resolve('');
				},
				() => {
					alert('上传失败');
					reject();
				}
			);
		});
	}
};
