import {createStore, combineReducers, compose, applyMiddleware} from 'redux';
import dtrReducer from './../reducers/dtr';
import userReducer from './../reducers/users';
import errorsReducer from './../reducers/errors';
import thunk from 'redux-thunk';
import tablesReducer from '../reducers/tablesReducer';
import posReducer from '../reducers/posReducer';

const initialState = {};
const middleware = [thunk];

const composeEnhancers =
    typeof window === 'object' &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?   
        window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
        // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
        }) : compose;


const store = createStore(
    combineReducers({
        dtr : dtrReducer,
        errors : errorsReducer,
        auth : userReducer,
        tables : tablesReducer,
        pos : posReducer
    }),
    initialState,
    composeEnhancers(
        applyMiddleware(...middleware)      
    )    
);

export default store;