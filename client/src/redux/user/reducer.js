import { handleActions } from 'redux-actions';
const initialState = {
  id: 0,
  name: undefined,
  email: undefined,
  phoneNumber: undefined,
  aptNumber: undefined,
  aptColorHex: undefined,
  buildingName: undefined,
  buildingId: undefined,
  registrationCapacity: undefined,
  role: undefined,
  confirmed: 0,
  phone_verify: 0,
  stripeCustomerId: undefined,
  subscriptionId: undefined,
  subscribedPlan: undefined,
  subscribedAt: undefined,
  booking_limit: undefined,
  createdAt: undefined,
}

export default handleActions({
  updateUser: (state, action) => ({ ...state, ...action.payload })
}, initialState);
