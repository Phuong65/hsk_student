import packageInfo from '../../package.json';
import { Environment } from '@environmentModel';
import { DEPLOYMENTS_FOR_DEV } from './deployment';

export const environment : Environment = {
    appVersion : packageInfo.version ,
    production : false ,
    deployment : DEPLOYMENTS_FOR_DEV[ 'server_dev' ]
};
