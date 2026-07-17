import { DeploymentEnvironment } from '@environmentModel';

type ProductionDomainName = 'ams.ictu.vn';

type DevelopmentServers = 'server_dev' | 'server_online';

export const DEPLOYMENTS_FOR_DEV : Record<DevelopmentServers , DeploymentEnvironment> = {
    'server_dev'    : new DeploymentEnvironment( {
        apiServiceConfig    : {
            title                                : 'Hệ thống thi - [HSK]' ,
            realm                                : 'hsk' ,
            port                                 : 10091 ,
            googleClientId                       : '196027039836-kjhoo8f8p3i2eldcodouvs94p1gbi4jo.apps.googleusercontent.com' ,
            protocol                             : 'https' ,
            X_APP_ID                             : 'FA3D8DB6-8B75-43BA-A73C-3540EE55F55B' , // app của Đức
            client                               : 'ictu' ,
            enableSignInWithGoogle               : true ,
            enableSignInWithMicrosoft            : true ,
            synchronization_time                 : 30 ,
            privateKey                           : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo71Bopp9KVV4jhZve6G65bMT5JG05GFC21PUtjsgmOlTb5Z8XwKSiPsK0Ohf0rH7V3mAd+9gCnPM2MS+/rRjaTnOKXX8HOTHeW1Glhb38QP14kgS8xsfzLQMrT87VgzAfJpBYJiuKjAocb7KUzXZVYJp9mjjsG0S+dbcPlQs4p4nBkthONKf5tfK1oGPgi+LvaOnl6KC44NHPZSLQiqwkRe4cmr3zYwjSX60W3kZwzig3j+FtzY4R2LKx9N+rLlN/g32B/EP7FnxKKTvBIxtgQM9x7wYkE4a2ziQtzt/SHcdrJLVsXhpaXIcd6cXf+qpXnx9ihBsRfY+t47tDZnXwIDAQAB' ,
            enableConstructionMode               : false ,
            enableTestingMode                    : true ,
            listOfRestrictedFileTypesForDownload : [ 'pdf' , 'video' , 'audio' , 'text' , 'image' ] ,
            domainName                           : 'api-dev.ictu.vn' ,
            fileHostingService                   : 'aws'
        } ,
        socketServiceConfig : {
            port : 10092 ,
            path : '/sso/socket'
        }
    } ) ,
    'server_online' : new DeploymentEnvironment( {
        apiServiceConfig    : {
            title                                : 'Hệ thống thi - [HSK]' ,
            realm                                : 'hsk' ,
            port                                 : 9081 ,
            googleClientId                       : '196027039836-kjhoo8f8p3i2eldcodouvs94p1gbi4jo.apps.googleusercontent.com' ,
            protocol                             : 'https' ,
            X_APP_ID                             : '60A111A9-09EE-48B6-9B2D-6CCB70F56B1F' ,
            client                               : 'ictu' ,
            enableSignInWithGoogle               : true ,
            enableSignInWithMicrosoft            : true ,
            synchronization_time                 : 30 ,
            privateKey                           : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo71Bopp9KVV4jhZve6G65bMT5JG05GFC21PUtjsgmOlTb5Z8XwKSiPsK0Ohf0rH7V3mAd+9gCnPM2MS+/rRjaTnOKXX8HOTHeW1Glhb38QP14kgS8xsfzLQMrT87VgzAfJpBYJiuKjAocb7KUzXZVYJp9mjjsG0S+dbcPlQs4p4nBkthONKf5tfK1oGPgi+LvaOnl6KC44NHPZSLQiqwkRe4cmr3zYwjSX60W3kZwzig3j+FtzY4R2LKx9N+rLlN/g32B/EP7FnxKKTvBIxtgQM9x7wYkE4a2ziQtzt/SHcdrJLVsXhpaXIcd6cXf+qpXnx9ihBsRfY+t47tDZnXwIDAQAB' ,
            enableConstructionMode               : false ,
            enableTestingMode                    : true ,
            listOfRestrictedFileTypesForDownload : [ 'pdf' , 'video' , 'audio' , 'text' , 'image' ] ,
            domainName                           : 'apps.ictu.edu.vn' ,
            fileHostingService                   : 'aws'
        } ,
        socketServiceConfig : {
            port : 9082 ,
            path : '/sso/socket'
        }
    } )
}

export const DEPLOYMENTS_FOR_PRODUCTION : Record<ProductionDomainName , DeploymentEnvironment> = {
    'ams.ictu.vn' : new DeploymentEnvironment( {
        apiServiceConfig    : {
            title                                : 'Hệ thống quản lý trung tâm học thuật - [AMS]' ,
            realm                                : 'dacms' ,
            port                                 : 9081 ,
            googleClientId                       : '196027039836-kjhoo8f8p3i2eldcodouvs94p1gbi4jo.apps.googleusercontent.com' ,
            protocol                             : 'https' ,
            X_APP_ID                             : 'CA6CEDF4-5198-46B7-9603-04174B47C501' ,
            client                               : 'ictu' ,
            enableSignInWithGoogle               : true ,
            enableSignInWithMicrosoft            : true ,
            synchronization_time                 : 30 ,
            privateKey                           : 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo71Bopp9KVV4jhZve6G65bMT5JG05GFC21PUtjsgmOlTb5Z8XwKSiPsK0Ohf0rH7V3mAd+9gCnPM2MS+/rRjaTnOKXX8HOTHeW1Glhb38QP14kgS8xsfzLQMrT87VgzAfJpBYJiuKjAocb7KUzXZVYJp9mjjsG0S+dbcPlQs4p4nBkthONKf5tfK1oGPgi+LvaOnl6KC44NHPZSLQiqwkRe4cmr3zYwjSX60W3kZwzig3j+FtzY4R2LKx9N+rLlN/g32B/EP7FnxKKTvBIxtgQM9x7wYkE4a2ziQtzt/SHcdrJLVsXhpaXIcd6cXf+qpXnx9ihBsRfY+t47tDZnXwIDAQAB' ,
            enableConstructionMode               : false ,
            enableTestingMode                    : true ,
            listOfRestrictedFileTypesForDownload : [ 'pdf' , 'video' , 'audio' , 'text' , 'image' ] ,
            domainName                           : 'apps.ictu.edu.vn' ,
            fileHostingService                   : 'aws'
        } ,
        socketServiceConfig : {
            port : 9082 ,
            path : '/sso/socket'
        }
    } )
}
