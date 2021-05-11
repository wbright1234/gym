import { applyMiddleware, createStore, combineReducers, compose } from 'redux';
import logger from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web
import user from './user/reducer';

export default function configureStore() {
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  const middlewares = [isDev && logger].filter(Boolean);
  const middlewareEnhancers = applyMiddleware(...middlewares);

  const enhancers = [middlewareEnhancers];
  const composedEnhancers = compose(...enhancers);

  const rootReducers = combineReducers({
    user
  });

  const persistConfig = {
    key: '740_gym',
    storage
  }

  const persistedReducer = persistReducer(persistConfig, rootReducers);

  const store = createStore(persistedReducer, undefined, composedEnhancers);
  const persistor = persistStore(store);

  return { store, persistor };
}
