<template>
	<div
		class="cd-video-player-main"
		ref="VideoPlayer"
		@mousedown="VolumnState = false"
		tabindex="-1"
		@keydown.esc="FullScreen(true)"
		@keydown.space="VideoPlayerCommend('play')"
		@keydown.left="ChangeTime('-')"
		@keydown.right="ChangeTime('+')"
	>
		<WindowsHeader :data="header" />
		<div class="cd-video-main">
			<div
				id="player"
				:style="{ height: VideoHeight }"
				crossorigin="*"
				@error="VideoError"
				@ended="VideoEnded"
				@dblclick="FullScreen"
				@click="VideoPlayerCommend('play')"
				@progress="VideoCache"
				@timeupdate="VideoProcess"
				ref="video"
				@durationchange="PlayButtonState = 'sf-icon-pause'"
				@seeking="PlayButtonState = 'sf-icon-circle-notch sf-spin'"
				@canplay="VideoPlayerCommend('play')"
			></div>
			<!-- <div :class="'cd-video-fliter ' + PlayButtonState + ' ' + animation" @click="VideoPlayerCommend('play')"></div> -->
			<div :class="'cd-video-control ' + BarAnimation" @mouseover="ShowControl" @mouseout="HideControl">
				<div :class="'cd-video-play ' + PlayButtonState" @click="VideoPlayerCommend('play')"></div>
				<div class="cd-video-player-slider-container" @mousedown="TimeChange" ref="slider">
					<div class="cd-player-process-bar" :style="{ width: ProcessWidth }">
						<span />
					</div>
					<div class="cd-video-temp-bar" :style="{ width: CacheWidth }"></div>
				</div>
				<div class="cd-video-player-time">{{ TimeText }}</div>
				<div
					:class="'sf-icon-volume-up ' + (VolumnState ? 'cd-video-player-volumn-active' : '')"
					@mousedown.stop="VolumnState ? (VolumnState = false) : (VolumnState = true)"
				></div>
				<div :class="FullButton" @click="FullScreen(FullButton)"></div>
				<div class="cd-video-player-volumn" v-show="VolumnState">
					<div class="cd-player-volumn-container" ref="volunm" @mousedown="ChangeVolumn">
						<div class="cd-player-volumn-slider">
							<span />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import Media from '../tools/media/media';
import WindowsHeader from '../components/DiskWindow/WindowHeader';
import Player from 'xgplayer/dist/simple_player';
import FlvPlayer from 'xgplayer-flv';
import { volume, playbackRate } from 'xgplayer/dist/controls';

const config = {
	control: false
};

export default {
	name: 'DiskVideoPlayer',
	components: { WindowsHeader },
	watch: {
		FullFlag: {
			handler() {
				if (this.FullFlag) {
					clearTimeout(this.TimeOutID);
					this.TimeOutID = setTimeout(() => {
						this.BarAnimation = 'animated fadeOut';
						this.VideoHeight = '100%';
						clearTimeout(this.TimeOutID);
					}, 5000);
					this.FullButton = 'sf-icon-compress';
				} else {
					this.BarAnimation = 'animated slideInUp';
					this.VideoHeight = 'calc(100% - 70px)';
					this.FullButton = 'sf-icon-expand';
				}
			}
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
			VideoHeight: 'calc(100% - 70px)',
			CacheWidth: 0,
			PlayButtonState: 'sf-icon-play',
			VolumnState: false,
			animation: '',
			BarAnimation: '',
			FullFlag: false,
			FullButton: 'sf-icon-expand',
			TimeOutID: 0,
			header: {
				title: ''
			}
		};
	},
	created() {
		this.player = null;
		this.state = 'playing'; // stop
		this.$ipc.on('win-data', (event, data) => {
			//接收打开视频文件的数据
			this.$nextTick(() => {
				data.forEach((item, index) => {
					item.play = false;
					if (item.active) {
						item.play = 'active';
						this.playCallBack(item, index);
						this.VideoPlayerCommend('play');
					}
				});
				let videoDom = this.$refs['video'];
				let player = (this.player = new FlvPlayer({
					id: 'player',
					url: this.getUrl(),
					videoInit: true,
					volume: 0.6,
					controls: config.control,
					// ignores:  ['time', 'definition', 'error', 'fullscreen', 'i18n', 'loading', 'mobile', 'pc', 'play', 'poster', 'progress', 'replay', 'volume'],
					danmu: {
						comments: [
							{
								duration: 15000,
								id: '1',
								start: 3000,
								txt: '长弹幕长弹幕长弹幕长弹幕长弹幕',
								style: {
									//弹幕自定义样式
									color: '#ff9500',
									fontSize: '20px',
									border: 'solid 1px #ff9500',
									borderRadius: '50px',
									padding: '5px 11px',
									backgroundColor: 'rgba(255, 255, 255, 0.1)'
								}
							}
						],
						area: {
							start: 0,
							end: 1
						}
					},
					playsinline: true,
					height: videoDom.offsetHeight,
					width: videoDom.offsetWidth
				}));
				// 播放器事件
				this.player.on('play', () => {
					console.log('开始播放...');
					this.PlayButtonState = 'sf-icon-pause';
					this.animation = 'animated zoomOut';
				});

				this.player.on('ended', () => {
					console.log('播放完成...');
					this.PlayButtonState = 'sf-icon-play';
					this.animation = 'animated zoomIn';
					this.state = 'ended';
				});
				this.player.on('playing', () => {
					console.log('播放中...');
					this.state = 'playing';
				});
				this.player.on('timeupdate', arg => {
					// console.log('arg', arg);
					console.log(arg.currentTime, arg.duration);
					this.VideoProcess(arg);
				});

				this.PlayList = data;
			});
		});
		this.bind();
	},
	methods: {
		getUrl() {
			return `/api${this.NowPlay.fileUrl}`;
		},
		bind() {
			this.$ipc.on('video-prev', () => {
				this.VideoPlayerCommend('prev');
			});
			this.$ipc.on('video-Play', () => {
				this.VideoPlayerCommend('play');
			});
			this.$ipc.on('video-next', () => {
				this.VideoPlayerCommend('next');
			});
		},
		playCallBack(item, index) {
			this.NowPlay = item;
			this.NowPlay.count = index;
		},
		ChangeTime(state) {
			let media = this.$refs.video;
			if (state === '-') {
				media.currentTime = media.currentTime - 5;
			} else {
				media.currentTime = media.currentTime + 5;
			}
		},
		VideoPlayerCommend(commend) {
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
						this.VideoPlayerCommend('play');
					}
					break;
				case 'play':
					this.$nextTick(() => {
						// 当前播放视频名称
						this.header.title = this.NowPlay.fileName;
						if (this.state === 'playing') {
							this.player.pause();
							// this.$ipc.send('player-control', 'video', 'pause');
						} else {
							this.player.play();
							// this.$ipc.send('player-control', 'video', 'play');
						}
					});
					break;
			}
		},
		ChangeVolumn() {
			let media = this.$refs.video;
			let volunm = this.$refs.volunm;
			Media.MediaControl(media, 'volunm', 'y', volunm, event);
		},
		VideoEnded() {
			let media = this.$refs.video;
			media.currentTime = 0;
			this.VideoPlayerCommend('play');
		},
		TimeChange() {
			let media = this.$refs.video;
			let slider = this.$refs.slider;
			Media.MediaControl(media, 'play', 'x', slider, event);
			this.VideoPlayerCommend('play');
		},
		VideoProcess(media) {
			this.TimeText = Media.secondDeal(media.currentTime) + '/' + Media.secondDeal(media.duration);
			this.ProcessWidth = (Math.round(media.currentTime) / Math.round(media.duration)) * 100 + '%';
		},
		VideoCache() {
			let media = this.$refs.video;
			try {
				this.CacheWidth = (media.buffered.end(media.buffered.length - 1) / media.duration).toFixed(2) * 100 + '%';
			} catch (e) {}
		},
		ShowControl() {
			this.$refs.VideoPlayer.focus();
			if (this.FullFlag) {
				this.BarAnimation = 'animated slideInUp';
				this.VideoHeight = 'calc(100% - 70px)';
			}
		},
		HideControl() {
			this.$refs.VideoPlayer.focus();
			if (this.FullFlag) {
				clearTimeout(this.TimeOutID);
				this.TimeOutID = setTimeout(() => {
					this.BarAnimation = 'animated fadeOut';
					this.VideoHeight = '100%';
					clearTimeout(this.TimeOutID);
				}, 5000);
			}
		},
		FullScreen(flag) {
			let el = this.$refs.VideoPlayer;
			el.focus();
			if (flag) {
				document.exitFullscreen
					? document.exitFullscreen()
					: document.mozCancelFullScreen
					? document.mozCancelFullScreen()
					: document.webkitExitFullscreen
					? document.webkitExitFullscreen()
					: '';
				this.$nextTick(() => {
					this.FullFlag = false;
				});
				clearTimeout(this.TimeOutID);
			}
			if (this.FullFlag) {
				document.exitFullscreen
					? document.exitFullscreen()
					: document.mozCancelFullScreen
					? document.mozCancelFullScreen()
					: document.webkitExitFullscreen
					? document.webkitExitFullscreen()
					: '';
				this.$nextTick(() => {
					this.FullFlag = false;
				});
				clearTimeout(this.TimeOutID);
			} else {
				(el.requestFullscreen && el.requestFullscreen()) ||
					(el.mozRequestFullScreen && el.mozRequestFullScreen()) ||
					(el.webkitRequestFullscreen && el.webkitRequestFullscreen()) ||
					(el.msRequestFullscreen && el.msRequestFullscreen());
				this.$nextTick(() => {
					this.FullFlag = true;
				});
			}
		},
		VideoError(e) {
			this.$Message.error(e);
		}
	},
	destroyed() {
		if (this.player) {
			this.player.off('ended', () => {
				console.log('解除ended');
			});
			this.player.destroy();
			this.player = null;
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
	// border: 1px solid red;
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
