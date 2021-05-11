import axios from 'axios';
import isJWT from 'validator/lib/isJWT';
import ls from 'local-storage';
import jwtDecode from 'jwt-decode';
import history from 'history.js';
import _ from 'lodash';
import dotenv from 'dotenv';
dotenv.config();

let accessToken = '';
const authInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 30000
})

const apiInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 120000
})

authInstance.interceptors.request.use(config => {
  return { ...config, headers: { ...config.headers, "Content-Type": "application/json" } };
}, err => {
  return Promise.reject(err);
})

apiInstance.interceptors.request.use(async config => {
  const refreshToken = ls.get('refreshToken');
  if (!accessToken && !refreshToken) {
    return Promise.reject('Access token cannot be null');
  }

  if (isJWT(refreshToken) && !accessToken) {
    accessToken = (await newToken()).data.accessToken;
  }

  if (!isJWT(accessToken)) {
    return Promise.reject('Access token is invalid');
  }

  if (tokenExpired(accessToken)) {
    accessToken = (await newToken()).data.accessToken;
  }
  const contentType = config.url === 'uploadCertificate' ? 'multipart/form-data' :'application/json';
  let additionalHeaders = { authorization: 'Bearer ' + accessToken, 'Content-Type': contentType };
  return { ...config, headers: { ...config.headers, ...additionalHeaders } };
}, err => {
  return Promise.reject(err);
})

const tokenExpired = (accessToken) => {
  const { exp } = jwtDecode(accessToken);
  return exp * 1000 <= Date.now();
}

const newToken = () => {
  return new Promise((res, rej) => {
    // const refreshToken = ls.get('refreshToken');
    const refreshToken = ls.get('refreshToken');
    authInstance.post('token', { refreshToken }).then(resp => {
      res(resp.data);
    }).catch(err => {
      console.log('New Token err: ', err);
      rej(err);
    });
  });
}

apiInstance.interceptors.response.use(resp => {
  return resp;
}, err => {
  if (err.response) {
    console.log(err.response);
    const { status } = err.response;
    if (status === 405) { // Invalid refresh token.
      ls.set('isLoggedIn', false);
      ls.set('refreshToken', null);
      ls.set('email', null);
      ls.set('password', null);
      history.push('/');
    }
  }
  return Promise.reject(err);
})

class APIs {
  setAccessToken = (token) => accessToken = token;
  getAccessToken = () => accessToken;
  shareholderRegister = (params) => authInstance.post('shareholderRegister', params);
  adminRegister = (params) => authInstance.post('adminRegister', params);
  confirmPhoneVerification = (params) => authInstance.post('confirmPhoneVerification', params);
  userLogin = (params) => authInstance.post('userLogin', params);
  getBuildings = () => authInstance.post('getBuildings');
  getPendingRegistrations = (params) => apiInstance.post('getPendingRegistrations', params);
  acceptRegistration = (params) => apiInstance.post('acceptRegistration', params);
  rejectRegistration = (params) => apiInstance.post('rejectRegistration', params);
  getUserInfo = () => apiInstance.get('getUserInfo');
  editApartment = (params) => apiInstance.post('editApartment', params);
  deleteApartment = (params) => apiInstance.delete('deleteApartment', { params });
  getBookings = (params) => apiInstance.get('getBookings', { params });
  saveBooking = (params) => apiInstance.post('saveBooking', params);
  cancelBooking = (params) => apiInstance.delete('cancelBooking', { params });
  getBookingsAtMonth = (params) => apiInstance.get('getBookingsAtMonth', { params });
  getBookedTimeSlots = (params) => apiInstance.get('getBookedTimeSlots', { params });
  getDoormen = (params) => apiInstance.post('getDoormen', params);
  addDoorman = (params) => apiInstance.post('addDoorman', params);
  cancelDoorman = (params) => apiInstance.delete('cancelDoorman', { params });
  getApartments = (params) => apiInstance.post('getApartments', params);
  saveBookDateLimit = (params) => apiInstance.post('saveBookDateLimit', params);
  saveTimeSlots = (params) => apiInstance.post('saveTimeSlots', params);
  getTimeSlots = (params) => apiInstance.post('getTimeSlots', params);
  uploadBuildingsLinkUsers = (params) => apiInstance.post('uploadBuildingsLinkUsers', params);
  onGetUserEmails = () => apiInstance.get('onGetUserEmails');
  onResendCode = (params) => authInstance.post('onResendCode', params);
  // stripe apis
  createStripeCustomer = (params) => authInstance.post('createStripeCustomer', params);
  deleteStripeCustomer = (params) => apiInstance.delete('deleteStripeCustomer', { data: params });
  createStripeSubscription = (params) => authInstance.post('createStripeSubscription', params);
  retrySubscriptionInvoice = (params) => authInstance.post('retrySubscriptionInvoice', params);
  updateSubscriptionStatus = (params) => authInstance.post('updateSubscriptionStatus', params);
  updateStripeSubscription = (params) => apiInstance.post('updateStripeSubscription', params);
  cancelSubscription = (params) => apiInstance.post('cancelSubscription', params);
  getSubscriptionInfo = (params) => apiInstance.post('getSubscriptionInfo', params);
  
  createFormData = (fields) => {
    const formData = new FormData();
    _.forEach(fields, (value, key) => {
      formData.append(key, value);
    });
    return formData;
  }
  uploadCertificate = (params, uploadListener) => apiInstance.post('uploadCertificate', this.createFormData(params), { onUploadProgress: uploadListener })
  resetPassword = (params) => authInstance.post('resetPassword', params);
  storePassword = (params) => authInstance.post('storePassword', params);
  userSignout = () => apiInstance.delete('userSignout', { params: { refreshToken: ls.get('refreshToken') } });
}

export default new APIs();
