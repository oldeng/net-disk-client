<template>
	<div
		class="cd-music-player-main"
		@mousedown="VolumnState = false"
		tabindex="-1"
		@keydown.space="PlayerCommend('play')"
		@keydown.left="ChangeTime('-')"
		@keydown.right="ChangeTime('+')"
	>
		<WindowsHeader :data="header" />
		<div class="cd-music-player-container">
			<div class="cd-music-player-title">{{ NowPlay.disk_name }}</div>
			<ul>
				<li class="cd-music-player-H-btn" />
				<li class="sf-icon-step-backward cd-music-player-S-btn" @click="PlayerCommend('prev')" />
				<li :class="'cd-music-player-B-btn ' + PlayButtonState" @click="PlayerCommend('play')" />
				<li class="sf-icon-step-forward cd-music-player-S-btn" @click="PlayerCommend('next')" />
				<li class="sf-icon-volume-up cd-music-player-H-btn" @mousedown.stop="VolumnState ? (VolumnState = false) : (VolumnState = true)" />
			</ul>
			<div class="cd-music-player-volumn" v-show="VolumnState">
				<div class="cd-player-volumn-container" ref="volunm" @mousedown="ChangeVolumn">
					<div class="cd-player-volumn-slider">
						<span />
					</div>
				</div>
			</div>
			<div class="cd-music-player-time">
				<div id="cd-audio-lrc-list"></div>
				<span>{{ TimeText }}</span>
			</div>
			<div class="cd-player-slider-container" @mousedown="TimeChange" ref="slider">
				<div class="cd-player-slider" :style="{ width: ProcessWidth }">
					<span />
				</div>
			</div>
			<canvas width="350" height="240" id="canvas" />
		</div>
		<audio
			muted
			preload="auto"
			ref="audio"
			@ended="PlayerCommend('next')"
			@timeupdate="MusicProcess"
			@error="PlayerCommend('next')"
			@durationchange="PlayButtonState = 'sf-icon-pause'"
			@seeking="PlayButtonState = 'sf-icon-circle-notch sf-spin'"
			@canplay="PlayerCommend('play')"
			:src="NowPlay.PlayUrl"
			id="audio"
		/>
		<MusicList v-bind:PlayList="PlayList" @play="playCallBack" ref="List" />
	</div>
</template>

<script>
import Media from '../tools/media/media';
import MusicList from '../components/DiskMusicPlayer/MusicList';
import WindowsHeader from '../components/DiskWindow/WindowHeader';
export default {
	name: 'DiskMusicPlayer',
	components: { MusicList, WindowsHeader },
	watch: {
		PlayList: {
			handler() {
				this.PlayList.forEach((item, index) => {
					if (item.play) {
						item.play = 'active';
						this.playCallBack(item, index);
						// this.GetLyr();
					}
				});
			},
			deep: true
		}
	},
	data() {
		return {
			PlayList: [],
			NowPlay: {
				disk_name: '准备播放',
				count: 0
			},
			TimeText: '00:00/00:00',
			ProcessWidth: 0,
			PlayButtonState: 'sf-icon-play',
			VolumnState: false,
			VisualState: true,
			handle: null,
			/* 定时执行句柄 */
			list: [],
			/* lrc歌词及时间轴数组 */
			regex: /^[^\[]*((?:\s*\[\d+\:\d+(?:\.\d+)?\])+)([\s\S]*)$/,
			/* 提取歌词内容行 */
			regex_time: /\[(\d+)\:((?:\d+)(?:\.\d+)?)\]/g,
			/* 提取歌词时间轴 */
			regex_trim: /^\s+|\s+$/,
			/* 过滤两边空格 */
			callback: null,
			/* 定时获取歌曲执行时间回调函数 */
			interval: 0.3,
			/* 定时刷新时间，单位：秒 */
			format: '<li>{html}</li>',
			/* 模板 */
			prefixid: 'cd-audio-lrc-list',
			/* 容器ID */
			hoverClass: 'this_lrc',
			/* 选中节点的className */
			hoverTop: 100,
			/* 当前歌词距离父节点的高度 */
			duration: 0,
			/* 歌曲回调函数设置的进度时间 */
			duration_: -1,
			header: {
				color: '#4f4f4',
				title: '',
				head: false,
				resize: false,
				mini: true
			}
		};
	},
	created() {
		this.$ipc.on('win-data', (event, data) => {
			//接收音乐文件列表的数据
			this.$nextTick(() => {
				data.forEach((item, index) => {
					item.play = false;
					if (item.active) {
						item.play = 'active';
						this.playCallBack(item, index);
						this.PlayerCommend('play');
					}
				});
				debugger;
				this.PlayList = data;
			});
		});
		this.bind();
	},
	methods: {
		bind() {
			this.$ipc.on('Next', () => {
				this.PlayerCommend('prev');
			});
			this.$ipc.on('Prev', () => {
				this.PlayerCommend('next');
			});
			this.$ipc.on('Play', () => {
				this.PlayerCommend('play');
			});
		},
		playCallBack(item, index) {
			this.NowPlay = item;
			this.NowPlay.count = index;
			this.NowPlay.PlayUrl = item.fileUrl;
		},
		ChangeTime(state) {
			let media = this.$refs.audio;
			if (state === '-') {
				media.currentTime = media.currentTime - 5;
			} else {
				media.currentTime = media.currentTime + 5;
			}
		},
		PlayerCommend(commend) {
			if (!this.PlayList.length) {
				return;
			}
			let NowCount = this.NowPlay.count;
			let AllCount = this.PlayList.length;
			switch (commend) {
				case 'prev':
					if (NowCount !== 0) {
						this.PlayList.forEach(item => {
							item.play = false;
						});
						this.PlayList[NowCount - 1].play = 'active';
					}
					break;
				case 'next':
					if (NowCount !== AllCount - 1) {
						this.PlayList.forEach(item => {
							item.play = false;
						});
						this.PlayList[NowCount + 1].play = 'active';
					} else {
						this.PlayerCommend('play');
					}
					break;
				case 'play':
					let media = this.$refs.audio;
					if (media.paused) {
						media.play();
						this.PlayButtonState = 'sf-icon-pause';
						this.$ipc.send('player-control', 'audio', 'pause');
					} else {
						media.pause();
						this.PlayButtonState = 'sf-icon-play';
						this.$ipc.send('player-control', 'audio', 'play');
					}
					this.header.title = this.NowPlay.fileName;
					if (this.VisualState) {
						this.Visual();
					}
					document.getElementsByClassName('cd-music-player-main')[0].focus();
					break;
			}
		},
		ChangeVolumn() {
			let media = this.$refs.audio;
			let volunm = this.$refs.volunm;
			Media.MediaControl(media, 'volunm', 'y', volunm, event);
		},
		TimeChange() {
			let media = this.$refs.audio;
			let slider = this.$refs.slider;
			Media.MediaControl(media, 'play', 'x', slider, event);
			this.PlayerCommend('play');
		},
		MusicProcess() {
			let media = this.$refs.audio;
			this.TimeText = Media.secondDeal(media.currentTime) + '/' + Media.secondDeal(media.duration);
			this.ProcessWidth = (Math.round(media.currentTime) / Math.round(media.duration)) * 100 + '%';
			console.log(this.TimeText, this.ProcessWidth);
		},
		Visual() {
			window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
			let audio = this.$refs.audio;
			let ctx = new AudioContext();
			let analyser = ctx.createAnalyser();
			let audioSrc = ctx.createMediaElementSource(audio);
			audioSrc.connect(analyser);
			analyser.connect(ctx.destination);
			let frequencyData = new Uint8Array(analyser.frequencyBinCount);
			let canvas = document.getElementById('canvas'),
				cwidth = canvas.width,
				cheight = canvas.height,
				meterWidth = 10, //width of the meters in the spectrum
				capHeight = 2,
				capStyle = '#5b5bea',
				meterNum = 800 / (10 + 2), //count of the meters
				capYPositionArray = []; ////store the vertical position of hte caps for the preivous frame
			ctx = canvas.getContext('2d');
			let gradient = ctx.createLinearGradient(0, 0, 0, 300);
			gradient.addColorStop(1, '#8140ff');
			gradient.addColorStop(0.5, '#5b5bea');
			gradient.addColorStop(0, '#fff');
			function renderFrame() {
				let array = new Uint8Array(analyser.frequencyBinCount);
				analyser.getByteFrequencyData(array);
				let step = Math.round(array.length / meterNum);
				ctx.clearRect(0, 0, cwidth, cheight);
				for (let i = 0; i < meterNum; i++) {
					let value = array[i * step];
					if (capYPositionArray.length < Math.round(meterNum)) {
						capYPositionArray.push(value);
					}
					ctx.fillStyle = capStyle;
					if (value < capYPositionArray[i]) {
						ctx.fillRect(i * 12, cheight - --capYPositionArray[i], meterWidth, capHeight);
					} else {
						ctx.fillRect(i * 12, cheight - value, meterWidth, capHeight);
						capYPositionArray[i] = value;
					}
					ctx.fillStyle = gradient;
					ctx.fillRect(i * 12, cheight - value + capHeight, meterWidth, cheight);
				}
				requestAnimationFrame(renderFrame);
			}
			renderFrame();
			this.VisualState = false;
		},
		GetLyr() {
			this.$Api.Disk.GetLyr(
				{
					name: this.NowPlay.disk_name
				},
				rs => {
					rs = JSON.parse(rs);
					if (rs.lrc.lyric !== '' || rs.lrc.lyric !== null) {
						let data = rs.lrc.lyric;
						this.start(data, () => {
							return this.$refs.audio.currentTime;
						});
					} else {
					}
				}
			);
		},
		start(txt, callback) {
			if (typeof txt !== 'string' || txt.length < 1 || typeof callback !== 'function') return; /* 停止前面执行的歌曲 */
			this.stop();
			this.callback = callback;
			let item = null,
				item_time = null,
				html = ''; /* 分析歌词的时间轴和内容 */
			txt = txt.split('\n');
			for (let i = 0; i < txt.length; i++) {
				item = txt[i].replace(this.regex_trim, '');
				if (item.length < 1 || !(item = this.regex.exec(item))) continue;
				while ((item_time = this.regex_time.exec(item[1]))) {
					this.list.push([parseFloat(item_time[1]) * 60 + parseFloat(item_time[2]), item[2]]);
				}
				this.regex_time.lastIndex = 0;
			} /* 有效歌词 */
			if (this.list.length > 0) {
				/* 对时间轴排序 */
				this.list.sort(function(a, b) {
					return a[0] - b[0];
				});
				if (this.list[0][0] >= 0.1) this.list.unshift([this.list[0][0] - 0.1, '']);
				this.list.push([this.list[this.list.length - 1][0] + 1, '']);
				for (let i = 0; i < this.list.length; i++) html += this.format.replace(/\{html\}/gi, this.list[i][1]); /* 赋值到指定容器 */
				document.getElementById(this.prefixid).innerHTML = html;
				/* 定时调用回调函数，监听歌曲进度 */
				if (typeof callback() === 'number') {
					this.handle = setInterval(() => {
						this.jump(callback());
					}, this.interval * 1000);
				}
			} else {
				/* 没有歌词 */
			}
		},
		/* 跳到指定时间的歌词 */
		jump(duration) {
			if (typeof this.handle !== 'number' || typeof duration !== 'number' || this.list.length < 1) return false;
			if (duration < 0) duration = 0;
			if (this.duration_ === duration) return;
			duration += 0.2;
			this.duration_ = duration;
			duration += this.interval;

			let left = 0,
				right = this.list.length - 1,
				last = right,
				pivot = Math.floor(right / 2),
				tmpobj = null,
				tmp = 0,
				thisobj = this;
			/* 二分查找 */
			while (left <= pivot && pivot <= right) {
				if (this.list[pivot][0] <= duration && (pivot === right || duration < this.list[pivot + 1][0])) {
					//if(pivot === right) this.stop();
					break;
				} else if (this.list[pivot][0] > duration) {
					/* left */
					right = pivot;
				} else {
					/* right */
					left = pivot;
				}
				tmp = left + Math.floor((right - left) / 2);
				if (tmp === pivot) break;
				pivot = tmp;
			}
			if (pivot === this.pivot) return;
			this.pivot = pivot;
			tmpobj = document.getElementById(this.prefixid).childNodes;
			for (let i = 0; i < tmpobj.length; i++) {
				tmpobj[i].className = this.prefixid;
			}
			if (tmpobj[pivot]) {
				tmpobj[pivot].className += ' ' + thisobj.hoverClass;
				/*tmp = tmpobj[pivot + 1].offsetTop - tmpobj[pivot].parentNode.offsetTop - this.hoverTop;
                    tmp = tmp > 0 ? tmp * 1 : 0;//如果不设置滚动条使用margin设置为-1
                    tmpobj[pivot].parentNode.scrollTop = tmp;//这里可以用margintop*/
			}
		},
		/* 停止执行歌曲 */
		stop() {
			if (typeof this.handle === 'number') clearInterval(this.handle);
			this.handle = this.callback = null;
			this.duration_ = -1;
			this.regex_time.lastIndex = 0;
			this.list = [];
		}
	}
};
</script>

<style lang="less" scoped>
/**进度条*/
.cd-player-process-bar span,
.cd-player-volumn-slider span,
.cd-player-slider span {
	position: relative;
	top: -2px;
	right: -2px;
	z-index: 1;
	float: right;
	display: block;
	width: 10px;
	height: 10px;
	border-radius: 10px;
	-webkit-border-radius: 10px;
	-moz-border-radius: 10px;
	background: #5b5bea;
}
.cd-player-volumn-container {
	overflow: initial;
	float: left;
	width: 6px;
	height: 100px;
	background: #bbbbbb;
	border-radius: 3px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
	position: relative;
	bottom: 0;
	overflow: unset !important;
}
.cd-player-volumn-slider {
	position: relative;
	top: 0;
	width: 100%;
	height: 100%;
	background: #5b5bea;
	overflow: unset !important;
}
.cd-player-process-bar,
.cd-player-volumn-slider,
.cd-player-slider {
	position: relative;
	z-index: 2;
	overflow: initial;
	width: 0;
	height: 5px;
	background: #5b5bea;
	border-radius: 3px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
}
.cd-player-volumn-container {
	overflow: initial;
	float: left;
	width: 6px;
	height: 100px;
	background: #bbbbbb;
	border-radius: 3px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
	position: relative;
	bottom: 0;
}
.cd-player-volumn-slider {
	position: relative;
	top: 0;
	width: 100%;
	height: 100%;
}
/*视频播放器*/
.cd-video-player-main {
	width: 100%;
	background: #fff;
	height: 100%;
	border: 3px solid green;
	box-sizing: border-box;
}
.cd-video-main {
	/* border: 5px solid red; */
	background: #000;
	-moz-user-select: none;
	-webkit-user-select: none;
	-ms-user-select: none;
	-khtml-user-select: none;
	user-select: none;
	width: 100%;
	height: 100%;
	box-sizing: border-box;
}

#player {
	border: 1px solid red;
	width: 100%;
	height: 100%;
	box-sizing: border-box;
}
/* .cd-video-main video {
    width:100%;
    height:calc(100% - 70px);
    -webkit-transition:all .35s;
    -moz-transition:all .35s;
    -o-transition:all .35s;
    z-index: 9999999;
} */
.cd-video-control {
	position: absolute;
	bottom: 0;
	padding: 5px;
	width: 100%;
	height: 40px;
	background: #fff;
	overflow: unset;
	-webkit-transition: all 0.35s;
	-moz-transition: all 0.35s;
	-o-transition: all 0.35s;
}
.cd-video-player-slider-container {
	float: left;
	overflow: initial;
	width: calc(100% - 210px);
	height: 5px;
	background: #cecece;
	margin-top: 13px;
	margin-left: 10px;
	border-radius: 3px;
	-webkit-border-radius: 3px;
	-moz-border-radius: 3px;
}
.cd-video-temp-bar {
	position: relative;
	top: -10px;
	z-index: 1;
	height: 100%;
	background: #bbbbbb;
}
.cd-video-control .sf-icon-volume-up,
.cd-video-control .sf-icon-expand,
.sf-icon-compress {
	width: 30px;
	float: left;
	height: 30px;
	line-height: 30px;
	color: #5a5a5a;
	font-size: 16px;
	text-align: center;
}
.cd-video-play {
	float: left;
	display: inline-block;
	width: 30px;
	height: 30px;
	color: #5a5a5a;
	text-align: center;
	font-size: 22px;
	line-height: 30px;
}
.cd-video-play:hover,
.cd-video-control .sf-icon-expand:hover,
.cd-video-control .sf-icon-volume-up:hover,
.cd-video-control .sf-icon-compress:hover {
	color: #5b5bea;
	cursor: pointer;
}
.cd-video-player-volumn {
	width: 30px;
	height: 129px;
	background: #fff;
	position: relative;
	float: right;
	right: 32px;
	bottom: 163px;
	padding: 12px;
	-webkit-animation-duration: 0.35s;
	animation-duration: 0.35s;
	-webkit-animation-fill-mode: both;
	animation-fill-mode: both;
	-webkit-animation-name: fadeIn;
	animation-name: fadeIn;
}
.cd-video-player-volumn-active {
	color: #5b5bea !important;
}
.cd-video-fliter {
	width: 80px;
	height: 80px;
	background: none;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	margin: auto;
	line-height: 80px;
	text-align: center;
	font-size: 35px;
	border: 2px solid #eee;
	color: #eee;
	border-radius: 100%;
}
.cd-video-fliter:hover {
	color: #0e88bf;
	border-color: #0e88bf;
}
.cd-video-player-time {
	float: left;
	width: 110px;
	height: 30px;
	line-height: 30px;
	font-size: 13px;
	padding: 0 10px;
	text-align: center;
	white-space: nowrap;
	color: #5a5a5a;
}
/*音乐播放器*/
.cd-music-player-main {
	background-color: #fff;
	width: 100%;
	height: 100%;
}
.cd-music-player-container {
	width: 100%;
	height: 150px;
	border-bottom: 2px solid #5b5bea;
	-webkit-app-region: drag;
}
.cd-music-player-container canvas {
	position: absolute;
	top: 0;
	z-index: 1;
	opacity: 0.75;
}
.cd-music-player-container ul {
	width: 252px;
	height: 60px;
	margin: 0 auto;
	position: relative;
	z-index: 2;
}
.cd-music-player-container ul > li {
	float: left;
	-webkit-app-region: no-drag;
}
.cd-music-player-title {
	width: 100%;
	height: 35px;
	text-align: center;
	color: #585858;
	font-weight: 700;
	font-size: 14px;
	position: relative;
	z-index: 2;
}
.cd-music-player-B-btn,
.cd-music-player-S-btn {
	border: 2px solid #5b5bea;
	display: block;
	border-radius: 25px;
	-webkit-border-radius: 25px;
	-moz-border-radius: 25px;
	text-align: center;
	color: #5b5bea;
	font-size: 18px;
	cursor: pointer;
}
.cd-music-player-B-btn:hover,
.cd-music-player-S-btn:hover {
	opacity: 0.8;
}
.cd-music-player-B-btn {
	width: 50px;
	height: 50px;
	line-height: 46px;
	background: #5b5bea;
	color: #fff;
}
.cd-music-player-S-btn {
	width: 35px;
	height: 35px;
	line-height: 31px;
	font-size: 14px;
	margin: 8px;
}
.cd-music-player-H-btn {
	width: 30px;
	color: #5b5bea;
	height: 30px;
	line-height: 30px;
	margin: 10px;
	font-size: 14px;
}
.cd-music-player-time {
	width: 91%;
	height: 25px;
	line-height: 20px;
	font-size: 12px;
	text-align: right;
	color: #585858;
	font-weight: bold;
	position: relative;
	z-index: 2;
}
.cd-player-slider-container {
	width: 85%;
	margin: 0 auto;
	overflow: initial;
	height: 5px;
	background: #eee;
	border-radius: 5px;
	-webkit-border-radius: 5px;
	-moz-border-radius: 5px;
	position: relative;
	z-index: 2;
	-webkit-app-region: no-drag;
}
.cd-music-player-volumn {
	width: 30px;
	height: 129px;
	background: #fff;
	position: absolute;
	float: right;
	right: 66px;
	top: 105px;
	padding: 12px;
	border: 1px solid #eee;
	z-index: 3;
	-webkit-app-region: no-drag;
}
#cd-audio-lrc-list {
	float: left;
	padding-left: 28px;
	width: 245px;
	height: 25px;
	font-size: 12px;
	color: #585858;
	-o-transition: all 350ms;
	-moz-transition: all 350ms;
	-webkit-transition: all 350ms;
}
#cd-audio-lrc-list * {
	display: none;
}
.this_lrc {
	text-align: left;
	display: block !important;
	-o-transition: all 350ms;
	-moz-transition: all 350ms;
	-webkit-transition: all 350ms;
	-webkit-animation-duration: 0.35s;
	animation-duration: 0.35s;
	-webkit-animation-fill-mode: both;
	animation-fill-mode: both;
	-webkit-animation-name: slideInUp;
	animation-name: slideInUp;
}
</style>
