import packageInfo from '../../package.json';
import { Environment } from '@environmentModel';
import { DEPLOYMENTS_FOR_PRODUCTION } from './deployment';

export const environment : Environment = {
    appVersion : packageInfo.version ,
    production : true ,
    deployment : DEPLOYMENTS_FOR_PRODUCTION[ 'ams.ictu.vn' ]
};
