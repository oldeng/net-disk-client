<template>
	<div>
		<div class="cd-index-section" v-show="!LoginSuccess">
			<section>
				<button type="button" class="sf-icon-cog" v-if="production" @click="OpenServerWindow" />
				<button type="button" class="sf-icon-window-minimize" @click="mini" />
				<button type="button" class="sf-icon-times" style="font-size: 16px" @click="close" />
			</section>
		</div>
		<div class="cd-index-main">
			<div class="cd-index-left">
				<div class="cd-index-head" style="-webkit-app-region: drag">
					<h1>{{ HeadText.h1 }}</h1>
					<p>{{ HeadText.tips }}</p>
				</div>
				<div class="cd-index-form" v-show="ShowState.login.state">
					<Logininput :data="LoginUserInput" />
					<Logininput :data="LoginPassInput" @keyup.enter.native="login" />
					<div class="cd-index-line-container">
						<label><Checkbox v-model="RemberPass" disabled>记住我</Checkbox></label>
						<a @click="changeType('forget')">忘记密码？</a>
					</div>
					<div class="cd-index-post-button">
						<button @click="login" :class="PostState">登录</button>
					</div>
					<div class="cd-index-other-login">
						<label>其他登录</label>
						<ul>
							<li class="sf-icon-wechat" ripple><span>&nbsp;&nbsp;微信</span></li>
							<div />
							<li class="sf-icon-qq" ripple><span>&nbsp;&nbsp;QQ</span></li>
						</ul>
					</div>
					<div class="cd-index-tips">
						<p>使用邮箱&nbsp;<span @click="changeType('register')">创建一个新用户</span></p>
					</div>
				</div>
				<div class="cd-index-form" v-show="ShowState.register.state">
					<Logininput :data="RegisterUserInput" />
					<Logininput :data="RegisterMailInput" />
					<Logininput :data="RegisterPassInput" />
					<Logininput :data="RegisterCodeInput" @keyup.enter.native="register" />
					<div class="cd-index-post-button">
						<button @click="register" :class="PostState">创建</button>
					</div>
					<div class="cd-index-tips">
						<p>已经有账号&nbsp;<span @click="changeType('login')">前往登录</span></p>
					</div>
				</div>
				<div class="cd-index-form" v-show="ShowState.forget.state">
					<Logininput :data="ForgetUserInput" />
					<Logininput :data="ForgetMailInput" />
					<Logininput :data="ForgetCodeInput" @keyup.enter.native="forget" />
					<div class="cd-index-line-container">
						<p>填写以上信息开始吧</p>
					</div>
					<div class="cd-index-post-button">
						<button @click="forget" :class="PostState">开始</button>
					</div>
					<div class="cd-index-tips">
						<p>没有问题了&nbsp;<span @click="changeType('login')">前往登录</span></p>
					</div>
				</div>
				<div class="cd-index-form" v-show="ShowState.verify.state">
					<Logininput :data="VerifyUserInput" />
					<Logininput :data="VerifyPassInput" />
					<Logininput :data="VerifyCodeInput" @keyup.enter.native="verify" />
					<div class="cd-index-tips">
						<p style="text-align: left">
							没有收到邮件&nbsp;<span @click="ReSend">{{ ResendData.Text }}</span>
						</p>
					</div>
					<div class="cd-index-post-button">
						<button @click="verify" :class="PostState">激活</button>
					</div>
					<div class="cd-index-tips">
						<p>账号激活了&nbsp;<span @click="changeType('login')">前往登录</span></p>
					</div>
				</div>
			</div>
			<div class="cd-index-right">
				<img draggable="false" src="../assets/img/logo/log.png" alt="" />
			</div>
		</div>
		<!--登录动画-->
		<div class="cd-index-logining" v-show="LoginSuccess">
			<ul>
				<li class="sf-icon-music" />
				<li class="sf-icon-users" />
				<li style="width: 180px">
					<img draggable="false" :src="User.head ? User.head + now : normalHead" alt="" />
					<div class="circle"></div>
				</li>
				<li class="sf-icon-video" />
				<li class="sf-icon-comments" />
				<p>{{ LoadingText }}</p>
			</ul>
		</div>
	</div>
</template>

<script>
import Logininput from '../components/LoginPage/l-input';
import LocalFile from '../tools/api/LocalFile';
import Cookies from 'js-cookie';

export default {
	name: 'LoginPage',
	components: { Logininput },
	computed: {
		now() {
			return '?' + Date.now();
		},
		normalHead() {
			return require('../assets/img/logo/logo.png');
		}
	},
	data() {
		return {
			production: process.env.NODE_ENV !== 'production',
			/*服务器值*/
			ServerAddress: 'http://localhost:8080',
			LoadingText: '正在加载用户信息', //登陆中提示
			/*这里为组件传值*/
			RemberPass: true,
			PostState: false,
			LoginSuccess: false,
			/*登录组件数据*/
			LoginUserInput: {
				icon: 'sf-icon-user',
				text: '用户名/手机号/邮箱/CloudID',
				value: ''
			},
			LoginPassInput: {
				icon: 'sf-icon-lock',
				type: 'password',
				text: '输入您的密码',
				value: ''
			},
			/*注册组件数据*/
			RegisterUserInput: {
				icon: 'sf-icon-user',
				text: '用户名',
				value: ''
			},
			RegisterMailInput: {
				icon: 'sf-icon-envelope',
				text: '输入您的邮箱',
				value: ''
			},
			RegisterPassInput: {
				icon: 'sf-icon-lock',
				type: 'password',
				text: '设置登录密码',
				value: ''
			},
			RegisterCodeInput: {
				icon: 'sf-icon-keyboard',
				state: 'verify',
				text: '验证码',
				value: ''
			},
			/*忘记密码组件数据*/
			ForgetUserInput: {
				icon: 'sf-icon-user',
				text: '用户名',
				value: ''
			},
			ForgetMailInput: {
				icon: 'sf-icon-envelope',
				text: '输入您的注册邮箱',
				value: ''
			},
			ForgetCodeInput: {
				icon: 'sf-icon-keyboard',
				state: 'verify',
				text: '验证码',
				value: ''
			},
			/*验证激活组件数据*/
			VerifyUserInput: {
				icon: 'sf-icon-user',
				text: '用户名',
				disabled: true,
				value: 123
			},
			VerifyPassInput: {
				icon: 'sf-icon-lock',
				type: 'password',
				text: '您的密码',
				value: ''
			},
			VerifyCodeInput: {
				icon: 'sf-icon-keyboard',
				state: 'verify',
				text: '邮箱激活码',
				value: ''
			},
			/*登录页面显示切换参数*/
			HeadText: {
				h1: '欢迎',
				tips: '请登录后继续'
			},
			ShowState: {
				login: {
					h1: '欢迎',
					tips: '请登录后继续',
					state: true
				},
				register: {
					h1: '开始',
					tips: '创建一个新用户',
					state: false
				},
				forget: {
					h1: '帮助',
					tips: '找回您的账号',
					state: false
				},
				verify: {
					h1: '准备',
					tips: '激活您的账号',
					state: false
				}
			},
			/*登录成功的值*/
			User: {
				head: null
			},
			/*重新发送邮件*/
			ResendData: {
				State: true,
				Text: '重新发送'
			},
			/*窗体对象*/
			WindowObject: false
		};
	},
	created: function() {
		this.WindowObject = this.$electron.remote.getCurrentWindow();
		this.$ipc.on('win-data', (e, data) => {
			//接收是否允许自动登录
			this.LoginUserInput.value = data.username || '';
			this.LoginPassInput.value = data.password || '';
			if (this.LoginUserInput.value) {
				this.login();
			}
		});
		window.addEventListener(
			'dragenter',
			function(e) {
				e.preventDefault();
			},
			false
		);
		window.addEventListener(
			'dragover',
			function(e) {
				e.preventDefault();
			},
			false
		);
		window.addEventListener(
			'dragleave',
			function(e) {
				e.preventDefault();
			},
			false
		);
		window.addEventListener(
			'drop',
			function(e) {
				e.preventDefault();
			},
			false
		);
	},
	methods: {
		login: function() {
			let username = this.LoginUserInput.value;
			let password = this.LoginPassInput.value;
			if (!username.length) {
				this.$Message.warning('请输入用户名/手机号/邮箱/CloudID');
				return false;
			}
			if (!password.length) {
				this.$Message.warning('请输入密码');
				return false;
			}
			if (this.PostState) {
				this.$Message.warning('正在验证登录信息');
				return false;
			}
			this.PostState = 'cd-index-posting';
			Cookies.remove('token');
			this.$Api.User.Login(
				{
					username: username,
					password: password
				},
				res => {
					// this.PostState = '';
					if (!res.success) {
						this.$Message.error('服务器错误');
						return;
					}
					this.LoginSuccess = true;
					this.WindowObject.setSize(800, 300);
					this.WindowObject.setAlwaysOnTop(false);
					setTimeout(() => {
						this.LoadingText = '正在加载网盘数据';
						this.$ipc.send('system', 'login', {
							username: username,
							password: password
						});
						setTimeout(() => {
							this.LoadingText = '欢迎回来 ' + rs.user;
						}, 1100);
					}, 1100);
				},
				res => {
					// this.PostState = '';
					if (res.msg === '未激活的用户') {
						this.$Message.info('请查看您的激活邮箱' + res.email);
						this.VerifyUserInput.value = username;
						this.changeType('verify');
					} else {
						this.$Message[res.success](res.msg);
					}
					if (!res.success) {
						this.$Message.error('服务器错误');
						return;
					}
					this.LoginSuccess = true;
					this.WindowObject.setSize(800, 300);
					this.WindowObject.setAlwaysOnTop(false);
					LocalFile.init(res.data.userId, () => {
						LocalFile.write('key', res.data.userId);
						LocalFile.write('login', JSON.parse(JSON.stringify(data)), true);
						Cookies.set('token', res.data.token);
					});
					setTimeout(() => {
						this.LoadingText = '正在加载网盘数据';
						this.$ipc.send('system', 'login', {
							username: username,
							password: password
						});
						setTimeout(() => {
							this.LoadingText = '欢迎回来 ' + res.user;
						}, 1100);
					}, 1100);
				}
			);

			this.PostState = '';
			// let res = {
			// 	success: true,
			// 	user: 'oldeng',
			// 	data: {
			// 		userId: 'oldeng',
			// 		token:
			// 			'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJwYXNzd29yZFwiOlwiOTJlYTk2YzIyZGZhYzgyMmNhNmRmNzhjNWFiYTFhMTBcIixcInJlZ2lzdGVyVGltZVwiOlwiMjAyMC0xMi0zMSAxNzozOTo1N1wiLFwic2FsdFwiOlwiMjA5MjkwMzQ4MjM1NDEwNVwiLFwidGVsZXBob25lXCI6XCIxNzE3ODg2OTk0M1wiLFwidXNlcklkXCI6NCxcInVzZXJuYW1lXCI6XCJ0ZXN0MlwifSIsImF1ZCI6InFpd2VuIiwicGFzc3dvcmQiOiIwMTAyMDMiLCJpc3MiOiJxaXdlbnNoYXJlIiwiZXhwIjoxNjE0NTYxODY3LCJpYXQiOjE2MTM5NTcwNjcsImp0aSI6IjJmZTI5YTBmLWRiYmUtNGJlOC04ZWQyLTBmMTUzYTEwMjg2NSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.N_Hlar3j08_sq_ocEIZcRtn7sPqkpIgARmv8PmcJDrs'
			// 	}
			// };
			// let data = {
			// 	userId: 'oldeng'
			// };
		},
		register: function() {
			let username = this.RegisterUserInput.value;
			let mail = this.RegisterMailInput.value;
			let password = this.RegisterPassInput.value;
			let code = this.RegisterCodeInput.value;
			if (!username.length) {
				this.$Message.warning('用户名不能为空');
				return false;
			}
			if (!mail.length) {
				this.$Message.warning('请输入注册邮箱');
				return false;
			}
			if (mail && !/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(mail)) {
				this.$Message.error('请输入正确的邮箱');
				return false;
			}
			if (!password.length) {
				this.$Message.warning('请输入密码');
				return false;
			}
			if (!code.length) {
				this.$Message.warning('请输入验证码');
				return false;
			}
			// if (this.PostState) {
			// 	this.$Message.warning('正在验证注册信息');
			// 	return false;
			// }
			// this.PostState = 'cd-index-posting';
			this.$Api.User.Register(
				{
					username: username,
					email: mail,
					password: password,
					validate: code
				},
				rs => {
					rs = rs[0];
					// this.PostState = '';
					if (!rs.state) {
						this.$Message.error('服务器错误');
						return;
					}
					if (rs.state === 'success') {
						let _this = this;
						this.$Message[rs.state]({
							content: rs.msg,
							onClose: () => {
								_this.changeType('verify');
								this.VerifyUserInput.value = username;
							}
						});
					} else {
						this.$Message[rs.state](rs.msg);
						this.RegisterCodeInput.value = '';
						this.RegisterCodeInput.url += '?' + Math.random();
					}
				},
				() => {
					// this.PostState = '';
				}
			);
		},
		forget: function() {
			let username = this.ForgetUserInput.value;
			let mail = this.ForgetMailInput.value;
			let code = this.ForgetCodeInput.value;
			if (!username.length) {
				this.$Message.warning('请输入您的用户名');
				return false;
			}
			if (!mail.length) {
				this.$Message.warning('请输入您注册时填写的邮箱');
				return false;
			}
			if (mail && !/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(mail)) {
				this.$Message.error('请输入正确的邮箱');
				return false;
			}
			if (!code.length) {
				this.$Message.warning('请输入验证码');
				return false;
			}
			// if (this.PostState) {
			// 	this.$Message.warning('正在验证您输入的信息');
			// 	return false;
			// }
			// this.PostState = 'cd-index-posting';
			this.$Api.User.Forget(
				{
					username: username,
					email: mail,
					validate: code
				},
				rs => {
					rs = rs[0];
					// this.PostState = '';
					if (!rs.state) {
						this.$Message.error('服务器错误');
						return;
					}
					if (rs.state === 'success') {
						let _this = this;
						this.$Message[rs.state]({
							content: rs.msg,
							onClose: () => {
								_this.changeType('login');
								this.LoginUserInput.value = username;
							}
						});
					} else {
						this.$Message[rs.state](rs.msg);
						this.ForgetCodeInput.value = '';
					}
				},
				() => {
					// this.PostState = '';
				}
			);
		},
		verify: function() {
			let username = this.VerifyUserInput.value;
			let pass = this.VerifyPassInput.value;
			let code = this.VerifyCodeInput.value;
			if (!username.length) {
				this.$Message.warning('请输入您的用户名');
				return false;
			}
			if (!pass.length) {
				this.$Message.warning('请输入密码');
				return false;
			}
			if (!code.length) {
				this.$Message.warning('请输入您收到的验证码');
				return false;
			}
			// if (this.PostState) {
			// 	this.$Message.warning('正在激活您的账号');
			// 	return false;
			// }
			// this.PostState = 'cd-index-posting';
			this.$Api.User.Verify(
				{
					name: username,
					pass: pass,
					code: code
				},
				rs => {
					rs = rs[0];
					// this.PostState = '';
					if (!rs.state) {
						this.$Message.error('服务器错误');
						return;
					}
					if (rs.state === 'success') {
						let _this = this;
						this.$Message[rs.state]({
							content: rs.msg,
							onClose: () => {
								_this.changeType('login');
								this.LoginUserInput.value = username;
							}
						});
					} else {
						this.$Message[rs.state](rs.msg);
						this.VerifyCodeInput.value = '';
					}
				},
				() => {
					// this.PostState = '';
				}
			);
		},
		ReSend: function() {
			if (!this.ResendData.State) {
				this.$Message.warning('激活邮件已发送或正在发送，请不要重复操作！');
				return false;
			}
			this.ResendData.Text = '正在发送';
			this.ResendData.State = false;
			this.$Api.User.ReSend(
				{
					name: this.VerifyUserInput.value
				},
				rs => {
					rs = rs[0];
					if (!rs.state) {
						this.$Message.error('服务器错误');
						return;
					}
					if (rs.state === 'success') {
						let time = 61;
						let a = setInterval(() => {
							time--;
							this.ResendData.State = false;
							this.ResendData.Text = time + 's后可重新发送';
							if (time === 0) {
								this.ResendData.State = true;
								this.ResendData.Text = '重新发送';
								clearInterval(a);
							}
						}, 1000);
					} else {
						this.ResendData.State = true;
					}
					this.$Message[rs.state](rs.msg);
				}
			);
		},
		changeType: function(type) {
			// if (this.PostState.length > 5) {
			// 	return;
			// }
			for (let item in this.ShowState) {
				this.ShowState[item].state = false;
			}
			this.ShowState[type].state = true;
			this.HeadText.h1 = this.ShowState[type].h1;
			this.HeadText.tips = this.ShowState[type].tips;
		},
		OpenServerWindow: function() {
			this.InputConfrim({
				title: '修改服务器地址',
				tips: '请输入服务器地址',
				value: this.ServerAddress,
				inputPattern: /(https|http):\/\/([^\/\:]+)?(\:[0-9]+)?(\/[^\?]+)?(\?.+)?/,
				inputErrorMessage: '服务器地址格式不正确',
				callback: value => {
					this.$Message.info('正在验证' + value + '是否可用');
					this.$Api.Check(
						value,
						rs => {
							this.$Message.success(value + '可用！');
							this.ServerAddress = value;
						},
						error => {
							this.$Message.error(value + '不可用');
							this.OpenServerWindow();
						}
					);
				}
			});
		},
		mini: function() {
			this.WindowObject.minimize();
		},
		close: function() {
			this.WindowObject.close();
		}
	}
};
</script>

<style scoped>
@import url('../assets/css/login.css');
</style>
