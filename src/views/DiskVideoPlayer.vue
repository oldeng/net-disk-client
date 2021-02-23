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
			<!-- <div :class="'cd-video-control ' + BarAnimation" @mouseover="ShowControl" @mouseout="HideControl">
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
			</div> -->
		</div>
	</div>
</template>

<script>
import Media from '../tools/media/media';
import WindowsHeader from '../components/DiskWindow/WindowHeader';
import Player from 'xgplayer/dist/simple_player';
import FlvPlayer from 'xgplayer-flv';
import { volume, playbackRate } from 'xgplayer/dist/controls';

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
			},
		},
	},
	data() {
		return {
			PlayList: [],
			NowPlay: {
				disk_name: '准备播放',
				count: 0,
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
				title: '',
			},
		};
	},
	created() {
		this.$ipc.on('win-data', (event, data) => {
			debugger;
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
				let player = new FlvPlayer({
					id: 'player',
					url: this.getUrl(),
					volume: 0.6,
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
									backgroundColor: 'rgba(255, 255, 255, 0.1)',
								},
							},
						],
						area: {
							start: 0,
							end: 1,
						},
					},
					playsinline: true,
					height: window.innerHeight-100,
					width: window.innerWidth,
				});
				player.emit('resourceReady', [
					{ name: '超清', url: '//sf1-hscdn-tos.pstatp.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv' },
					{ name: '高清', url: '//sf1-hscdn-tos.pstatp.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-480p.flv' },
					{ name: '标清', url: '//sf1-hscdn-tos.pstatp.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-360p.flv' },
				]);
				// this.PlayList = data;
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
						this.PlayList.forEach((item) => {
							item.play = false;
						});
						this.PlayList[NowCount - 1].play = 'active';
					}
					break;
				case 'next':
					if (NowCount !== AllCount - 1) {
						this.PlayList.forEach((item) => {
							item.play = false;
						});
						this.PlayList[NowCount + 1].play = 'active';
					} else {
						this.VideoPlayerCommend('play');
					}
					break;
				case 'play':
					this.$nextTick(() => {
						let media = this.$refs.video;
						if (media.paused) {
							this.PlayButtonState = 'sf-icon-pause';
							this.animation = 'animated zoomOut';
							this.$ipc.send('player-control', 'video', 'pause');
						} else {
							this.PlayButtonState = 'sf-icon-play';
							this.animation = 'animated zoomIn';
							this.$ipc.send('player-control', 'video', 'play');
						}
						this.header.title = this.NowPlay.disk_name;
						this.$refs.VideoPlayer.focus();
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
		VideoProcess() {
			let media = this.$refs.video;
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
			debugger;
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
		},
	},
};
</script>

<style lang="less" scoped>
@import url('../assets/css/player.css');
.player {
	border: 1px solid red;
}
</style>
