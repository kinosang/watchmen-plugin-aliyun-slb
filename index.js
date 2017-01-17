var ALY = require('aliyun-sdk');

var slb = new ALY.SLB({
    accessKeyId: process.env.WATCHMEN_ALIYUN_ACCESS_ID,
    secretAccessKey: process.env.WATCHMEN_ALIYUN_ACCESS_KEY,
    endpoint: 'https://slb.aliyuncs.com',
    apiVersion: '2014-05-15'
});

var eventHandlers = {

    /**
     * On a new outage
     * @param {Object} service
     * @param {Object} outage
     * @param {Object} outage.error check error
     * @param {number} outage.timestamp outage timestamp
     */

    onNewOutage: function(service, outage) {
        var region = ["cn-beijing", "cn-qingdao", "cn-hangzhou", "cn-hongkong", "cn-shenzhen", "us-west-1"];
        var tag = service.name.split(" ");

        var isRegion = region.filter(function(item) {
            return item == tag[0]
        }).length ? true : false;

        if (isRegion) {
            slb.describeLoadBalancers({
                RegionId: tag[0],
                ServerId: tag[1]
            }, function(err, res) {
                var LoadBalancer = res.LoadBalancers.LoadBalancer[0];

                slb.describeLoadBalancerAttribute({
                    LoadBalancerId: LoadBalancer.LoadBalancerId
                }, function(err, oldLoadBalancer) {
                    slb.deleteLoadBalancer({
                        LoadBalancerId: oldLoadBalancer.LoadBalancerId
                    }, function(err) {
                        if (!err) {
                            slb.createLoadBalancer({
                                RegionId: oldLoadBalancer.RegionId,
                            }, , function(err, newLoadBalancer) {
                                oldLoadBalancer.ListenerPorts.ListenerPort.forEach(function(port) {
                                    slb.createLoadBalancerTCPListener({
                                        LoadBalancerId: newLoadBalancer.LoadBalancerId,
                                        ListenerPort: port,
                                        BackendServerPort: port,
                                        Bandwidth: -1,
                                    });
                                });

                                slb.addBackendServers({
                                    LoadBalancerId: newLoadBalancer.LoadBalancerId,
                                    BackendServers: oldLoadBalancer.BackendServers.BackendServer,
                                });
                            });
                        }
                    });
                });
            });
        }
    },

    /**
     * Failed ping on an existing outage
     * @param {Object} service
     * @param {Object} outage
     * @param {Object} outage.error check error
     * @param {number} outage.timestamp outage timestamp
     */

    onCurrentOutage: function(service, outage) {
        //
    },

    /**
     * Failed check (it will be an outage or not according to service.failuresToBeOutage
     * @param {Object} service
     * @param {Object} data
     * @param {Object} data.error check error
     * @param {number} data.currentFailureCount number of consecutive check failures
     */

    onFailedCheck: function(service, data) {
        //
    },

    /**
     * Warning alert
     * @param {Object} service
     * @param {Object} data
     * @param {number} data.elapsedTime (ms)
     */

    onLatencyWarning: function(service, data) {
        //
    },

    /**
     * Service is back online
     * @param {Object} service
     * @param {Object} lastOutage
     * @param {Object} lastOutage.error
     * @param {number} lastOutage.timestamp (ms)
     */

    onServiceBack: function(service, lastOutage) {
        //
    },

    /**
     * Service is responding correctly
     * @param {Object} service
     * @param {Object} data
     * @param {number} data.elapsedTime (ms)
     */

    onServiceOk: function(service, data) {
        //
    }
};

function ConsolePlugin(watchmen) {
    watchmen.on('new-outage', eventHandlers.onNewOutage);
    //watchmen.on('current-outage', eventHandlers.onCurrentOutage);
    //watchmen.on('service-error', eventHandlers.onFailedCheck);

    //watchmen.on('latency-warning', eventHandlers.onLatencyWarning);
    //watchmen.on('service-back', eventHandlers.onServiceBack);
    //watchmen.on('service-ok', eventHandlers.onServiceOk);
}

exports = module.exports = ConsolePlugin;
