import { post, Ajax, severAddress } from './request';
import LocalFile from './LocalFile';
import Cookies from 'js-cookie';

export default {
	Login(data, callback, error) {
		post('/user/login', data)
			.then(res => {
				debugger;
				if (res.success) {
					LocalFile.init(res.data.userId, () => {
						LocalFile.write('key', res.data.userId);
						LocalFile.write('login', JSON.parse(JSON.stringify(data)), true);
						Cookies.set('token', res.data.token);
						callback && callback(res);
					});
				} else {
					error && error(res);
				}
			})
			.catch(err => {
				error();
			});
	},
	Register(data, callback, error) {
		Ajax({
			url: '/service/user/register',
			data: data,
			success: callback,
			error: error
		});
	},
	Forget(data, callback, error) {
		Ajax({
			url: '/service/user/forget',
			data: data,
			success: callback,
			error: error
		});
	},
	Verify(data, callback, error) {
		Ajax({
			url: '/service/user/verifyCheck',
			data: data,
			success: callback,
			error: error
		});
	},
	UserInfo(callback, error) {
		Ajax({
			url: '/service/user/UserInfo',
			data: [],
			success: rs => {
				localStorage.LoginTime = rs[0].login_time;
				rs[0].birth = this.age(rs[0].birthday);
				rs[0].userhead = severAddress() + '/' + rs[0].userhead + '?' + Date.now();
				LocalFile.write('user', rs[0]);
				callback(rs);
			},
			error: error
		});
	},
	ReSend(data, callback, error) {
		Ajax({
			url: '/service/user/resend',
			data: data,
			success: callback,
			error: error
		});
	},
	Update(data, callback, error) {
		Ajax({
			url: '/service/user/UpdateUserInfo',
			data: data,
			upload: true,
			success: callback,
			error: error
		});
	},
	FeedBack(data, callback, error) {
		Ajax({
			url: '/service/user/SendCouple',
			data: data,
			success: callback,
			error: error
		});
	},
	ChangePass(data, callback, error) {
		Ajax({
			url: '/service/user/ChangePass',
			data: data,
			success: callback,
			error: error
		});
	},
	ChangeSafeEmail(data, callback, error) {
		Ajax({
			url: '/service/user/ChangeSafeEmail',
			data: data,
			success: callback,
			error: error
		});
	},
	age(birth) {
		birth = Date.parse(birth ? birth : ''.replace('/-/g', '/'));
		return parseInt((new Date() - new Date(birth)) / (1000 * 60 * 60 * 24 * 365));
	}
};
