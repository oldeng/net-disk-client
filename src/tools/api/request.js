import axios from 'axios/index';
import Cookies from 'js-cookie';

axios.defaults.withCredentials = true;
function severAddress() {
	return 'http://localhost:8090';
}
function updateServer() {
	return 'https://update.zjinh.cn/c-disk';
}

// 请求拦截器
axios.interceptors.request.use(
	config => {
		if (Cookies.get('token', { domain: '' })) {
			config.headers['token'] = Cookies.get('token', { domain: '' });
		} else {
			config.headers['token'] = Cookies.get('token');
		}
		return config;
	},
	error => {
		console.log(error);
		return Promise.reject(error);
	}
);

function Ajax(options) {
	let params = new URLSearchParams();
	let method = options.method ? options.method : 'POST';
	if (method === 'POST' && !options.upload) {
		// options.data.__client_type = 'cd_clouddisk_CloudDisk';
		for (let item in options.data) {
			params.append(item, options.data[item]);
		}
	} else {
		params = options.data;
	}
	axios({
		method: method,
		data: params,
		emulateJSON: true,
		withCredentials: true,
		url: severAddress() + options.url,
		headers: options.upload ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}
	}).then(
		response => {
			options.success && typeof options.success === 'function' ? options.success(response.data) : '';
		},
		function(error) {
			options.error && typeof options.error === 'function' ? options.error(error) : '';
		}
	);
}

export function post(url, data = {}, info) {
	// let newData = data;
	// if (info) {
	// 	//  转formData格式
	// 	newData = new FormData();
	// 	for (let i in data) {
	// 		newData.append(i, data[i]);
	// 	}
	// }
	// return axios.post(url, newData).then(res => {
	// 	return res.data;
	// });
	const instance = axios.create();
	const options = Object.assign(
		{
			headers: {
				'content-type': 'application/json',
				token: Cookies.get('token')
			}
		},
		{
			url: url,
			method: 'post',
			data: data
		}
	);
	return instance(options).then(res => {
		console.log('res', res);
		return res.data;
	});
}
export { Ajax, severAddress, updateServer };
