/*
Copyright 2018 SOL Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

/**
 * @file Services module enables capsules to communicate with third-parties in an optimal way, free of implementation-level details. Read [more]{@link module:services}.
 * @copyright 2018 SOL Software
 * @license Apache-2.0
 * @version 0.1.0
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.services = factory();
    }
}
    (this, function () {

        'use strict';

        /**
         * The collection of built-in service types of services.js module.
         *
         * @memberof module:services
         * @namespace
         * @public
         * @readonly
         * @since 0.1.0
         * @static
         */
        var ServiceType = {
            /**
             * Service type that enables delivery of requests to the target JavaScript function. Each service of this type should have the following properties specified in its service config object (the second argument of the service registration [register]{@link module:services.register} function):
             * <p> - (string) type - set to services.ServiceType.FUNCTION <br>
             * - (Function) func - target function to which to deliver the package (of requests)
             */
            FUNCTION: 'FUNCTION',

            /**
             * Service type that enables delivery of requests to the target worker thread. Each service of this type should have the following properties specified in its service config object (the second argument of the service registration [register]{@link module:services.register} function):
             * <p> - (string) type - set to services.ServiceType.WORKER <br>
             * - (Worker) worker - target worker (in case of using dedicated worker) or target worker's port (in case of using shared worker) to which to deliver the package (of requests)
             */
            WORKER: 'WORKER',

            /**
             * Service type that enables delivery of asynchronous requests to the target JavaScript function. Each service of this type should have the following properties specified in its service config object (the second argument of the service registration [register]{@link module:services.register} function):
             * <p> - (string) type - set to services.ServiceType.ASYNC_FUNCTION <br>
             * - (Function) func - target function to which to deliver the package (of requests)
             */
            ASYNC_FUNCTION: 'ASYNC_FUNCTION'
        };

        /**
         * Registers a new service type with the given name; service type that operates as specified in the given function. Upon service type registration, services of that type could be registered (using [register]{@link module:services.register} function) and used to deliver packages of requests to their destinations.
         * <p> For example, one could create a service type to handle AJAX communication with the server and then for each URL a separate service of that service type would exist.
         *
         * @param {string} serviceType - the name of the service type to create
         * @param {Funtion} serviceFunction - the function of the service type to be created:
         * <p> - <b>function serviceFunction(requests, serviceConfig, serviceName)</b> - The function should perform all necessary actions in order to send requests to their destination and receive and handle responses. More precisely, it needs to pack all client requests into a single physical request, send that physical request to its destination, wait for the physical response, unpack the physical response into individual responses, and handle each individual response. Handling responses means resolving or rejecting each request's promise by simply calling r.resolve(response) or r.reject(error). Here, r represents an individual request. The requests are given in the requests parameter which represents an array of [Request]{@link module:services.Request} objects each of which contains the client's request in its <i>body</i> property and resolve and reject functions in its <i>resolve</i> and <i>reject</i> properties. serviceConfig is the configuration object of the particular service (the second argument of the service registration [register]{@link module:services.register} function). serviceName is the name of the particular service (the first argument of the service registration register function).
         *
         * @example <caption>How to create a service type?</caption>
         * services.registerType('newServiceType', function(requests, serviceConfig, serviceName){
         *     var packed = [];
         *     for (var i = 0; i < requests.length; i++)
         *         packed.push(requests[i].body); // Note that client's request is in the body property!
         *
         *     var responses = sendRequests...(packed, serviceConfig); // send packed requests according to the service configuration - serviceConfig object; and get responses
         *     for (var i = 0; i < responses.length; i++){
         *         var request = requests[i],
         *         response = responses[i];
         *         if (response != null && response.success)
         *             request.resolve(response); // call the Promise's resolve function (the Request's resolve property)
         *         else
         *             request.reject(response.error); // call the Promise's reject function (the Request's reject property)
         *     }
         * });
         *
         * @example <caption>How to use newly created service type?</caption>
         * // let's first register service of the newly created type
         * services.register('myService', {
         *    type: 'newServiceType',
         *    ... // maybe some additional properties
         * });
         *
         * // and then let's use the service to send requests
         * services.send('myService', {...your request here...})
         * .then(function(response){
         *     alert('success');
         * }, function(error){
         *     alert('error');
         * });
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function registerType(serviceType, serviceFunction) {
            if (!isString_(serviceType))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceType is a string.'));
            if (typeof serviceFunction !== 'function')
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceFunction is a function.'));

            serviceTypes_[serviceType] = serviceFunction;
        }

        /**
         * Creates new service, registers it under the given name, and associates it to the given service configuration object. After that, the newly created service may be used to handle communication with the target server it represents. To send request to this service (i.e. to the target server) use the [send]{@link module:services.send} function. Note that there is no need (nor is it possible) to keep a reference to a service in a JavaScript variable. Instead, the service is always referenced by its name. This makes services easily accessible from anywhere in the code.
         *
         * @param {string} serviceName - the name under which to register new service
         * @param {string} serviceConfig - the service configuration object. This object must have the 'type' property which is a string that matches the name of either a built-in service type (one of the [services.js]{@link module:services.ServiceType}, [capsula.js]{@link module:capsula.ServiceType}, or [html.js]{@link module:html.ServiceType} service types) or the service type created using [registerType]{@link module:services.registerType} function (custom service type). In addition to the 'type' property, the serviceConfig object may have additional service-type-specific properties. To learn service-type-specific properties of built-in service types, consult the documentation.
         * @param {Boolean} opt_overwrite - a flag used to specify whether to overwrite the (existing) service with the given name. If opt_overwrite is not provided or set to false, the [SERVICE_ALREADY_REGISTERED error]{@link module:services.Errors.SERVICE_ALREADY_REGISTERED} would be thrown in case when the given service name matches the service name of an existing service.
         *
         * @example <caption>Example of ServiceType.FUNCTION service </caption>
         * services.register('myService1', {
         *     type: services.ServiceType.FUNCTION,
         *     func: someFunction // or simply function(){...}
         * });
         *
         * @example <caption>Example of ServiceType.WORKER service </caption>
         * services.register('myService4', {
         *     type: services.ServiceType.WORKER,
         *     worker: someWorker // or someWorker.port in case of a shared worker
         * });
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}, [SERVICE_ALREADY_REGISTERED]{@link module:services.Errors.SERVICE_ALREADY_REGISTERED}
         */
        function register(serviceName, serviceConfig, opt_overwrite) {
            if (!isString_(serviceName))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceName is a string.'));

            if (serviceConfig == null || !isString_(serviceConfig.type) || typeof serviceTypes_[serviceConfig.type] !== 'function')
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceConfig is not null and serviceConfig.type is a string which specifies existing serviceType (see method registerType).'));

            if (!opt_overwrite && serviceRegistry_[serviceName])
                throw new Error(Errors.SERVICE_ALREADY_REGISTERED.toString(serviceName));

            serviceRegistry_[serviceName] = serviceConfig;
        }

        /**
         * Unregisters the service with the given name. The service is no longer in operation, i.e. can not be used.
         *
         * @param {string} serviceName - the name of the service to unregister
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [SERVICE_UNREGISTERED]{@link module:services.Errors.SERVICE_UNREGISTERED}, [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function unregister(serviceName) {
            if (!isRegistered(serviceName))
                throw new Error(Errors.SERVICE_UNREGISTERED.toString(serviceName));

            delete serviceRegistry_[serviceName];
            delete serviceStatusRegistry_[serviceName];
        }

        /**
         * Checks whether the service with the given name is registered or not.
         *
         * @param {string} serviceName - the name of the service to check
         * @returns {boolean} whether the service is registered (true) or not (false)
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function isRegistered(serviceName) {
            if (!isString_(serviceName))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceName is a string.'));

            return (!!serviceRegistry_[serviceName]);
        }

        /**
         * Sends the given request to the service with the given name. Returns the Promise object to use to add <i>then</i> and <i>catch</i> handlers. The request stays in the 'service' layer until either [flush]{@link module:services.flush} is called for that particular service or all services are flushed by [flushAll]{@link module:services.flushAll}.
         *
         * @param {string} serviceName - the name of the service to send request to
         * @param {Object} request - the client's request object to send to a service (can be any object whatsoever)
         * @returns {Promise} - the promise object
         *
         * @example <caption>Example of sending a request to a service </caption>
         * services.send('myService', request)
         * .then(function(response){
         *     alert('success');
         * }, function(error){
         *     alert('error');
         * });
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [SERVICE_UNREGISTERED]{@link module:services.Errors.SERVICE_UNREGISTERED}, [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function send(serviceName, request) {
            if (!isRegistered(serviceName))
                throw new Error(Errors.SERVICE_UNREGISTERED.toString(serviceName));

            var buffer = serviceBuffers_[serviceName];
            if (!buffer) {
                buffer = [];
                serviceBuffers_[serviceName] = buffer;
            }

            var r = new Request(request);
            buffer.push(r);
            return r.promise;
        }

        /**
         * Flushes the service with the given name, i.e. packs all client requests (previously sent to this service using the [send]{@link module:services.send} function) into a single physical request, sends that physical request to its destination, waits for the physical response, unpacks the physical response into individual responses, and resolves or rejects each request's promise. Clears the service's internal buffer of requests which makes sure the service is ready to accept new requests.
         *
         * @param {string} serviceName - the name of the service to flush
         *
         * @memberof module:services
         * @public
         * @see [send]{@link module:services.send}
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}, [SERVICE_UNREGISTERED]{@link module:services.Errors.SERVICE_UNREGISTERED}
         */
        function flush(serviceName) {
            if (!isRegistered(serviceName))
                throw new Error(Errors.SERVICE_UNREGISTERED.toString(serviceName));

            var serviceConfig = serviceRegistry_[serviceName],
            serviceFunction = serviceTypes_[serviceConfig.type],
            serviceBuffer = serviceBuffers_[serviceName];

            if (!serviceBuffer || serviceBuffer.length === 0)
                return;

            serviceBuffers_[serviceName] = []; // this must be before the following

            serviceFunction(serviceBuffer, serviceConfig, serviceName);
        }

        /**
         * Flushes all services in the service layer by simply calling [flush]{@link module:services.flush} for each of the existing services.
         *
         * @memberof module:services
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function flushAll() {
            for (var serviceName in serviceRegistry_)
                flush(serviceName);
        }

        /**
         * Creates a Request object as a wrapper of a client's request object.
         *
         * @classdesc <p> A class not meant to be directly instantiated by the users of the API.
         * <p> However, when implementing a new service type i.e. when implementing service type's service function, Request object's properties are used a) to get corresponding client's request (the body property) and b) to get resolve and reject functions of the Promise of the Request object (resolve and reject properties). See the [registerType]{@link module:services.registerType} function for more details, including the examples.
         *
         * @param {Object} body - client's request object
         * @class
         * @memberof module:services
         * @public
         */
        function Request(body) {
            /**
             * The client's request itself (request body).
             *
             * @type {Object}
             * @public
             */
            this.body = body;

            /**
             * The client request Promise's resolve function.
             *
             * @type {Function}
             * @public
             */
            this.resolve;

            /**
             * The client request Promise's reject function.
             *
             * @type {Function}
             * @public
             */
            this.reject;

            var that = this;

            /**
             * The client request's Promise.
             *
             * @type {Promise}
             * @public
             */
            this.promise = new Promise(function (resolve, reject) {
                    that.resolve = resolve;
                    that.reject = reject;
                });
        }

        /**
         * @private
         */
        var serviceRegistry_ = {},

        /**
         * @private
         */
        serviceStatusRegistry_ = {},

        /**
         * @private
         */
        serviceBuffers_ = {},

        /**
         * @private
         */
        serviceTypes_ = {};

        /**
         * Checks whether an object is Array or not.
         *
         * @private
         * @param {object} subject - the variable that is tested for Array identity check
         * @returns weather the variable is an Array or not
         *
         * Attribution: https://shamasis.net/2011/08/infinite-ways-to-detect-array-in-javascript/
         */
        var isArray_ = (function () {
            // Use compiler's own isArray when available
            if (Array.isArray) {
                return Array.isArray;
            }

            // Retain references to variables for performance
            // optimization
            var objectToStringFn = Object.prototype.toString,
            arrayToStringResult = objectToStringFn.call([]);

            return function (subject) {
                return objectToStringFn.call(subject) === arrayToStringResult;
            };
        }
            ());

        /**
         * @private
         */
        function isNumber_(obj) {
            return typeof obj === 'number';
        }

        /**
         * @private
         */
        function isObject_(obj) {
            return obj && typeof obj === 'object' && !isArray_(obj);
        }

        /**
         * @private
         */
        function isString_(obj) {
            return typeof obj === 'string';
        }

        /**
         * @private
         */
        function checkFunction_(fn, name) {
            if (typeof fn !== 'function')
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure ' + name + ' is a function (if provided).'));
        }

        // *****************************
        // Errors and Error Codes
        // *****************************

        /**
         * Creates new ErrorMessage object out of an error code and an error description template.
         *
         * @classdesc <p> Helps generating and manipulating error messages. Comprises the error code and the error description template which contains zero or more placeholders to be replaced with arbitrary text during the generation of error message.
         * <p> This class provides means to create error message out of the error code and description template with placeholders as well as to check whether an arbitrary Error object has the same error code (e.x. error code: #1000) as this ErrorMessage object.
         *
         * @example <caption>Example of creating ErrorMessage object</caption>
         * var ILLEGAL_ARGUMENT = new services.ErrorMessage(1000, 'Illegal argument(s). $1'); // $1 is a placeholder
         *
         * @memberof module:services
         * @class
         * @param {number} code - error code
         * @param {string} desc - error description template with $-based placeholders such as $1, $2, etc.
         * @public
         * @since 0.1.0
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function ErrorMessage(code, desc) {
            if (!isNumber_(code))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure code is a number.'));
            if (!isString_(desc))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure desc is a string.'));
            this.code = code;
            this.desc = desc;
        }

        /**
         * Creates error message text (string) based on the error code, the error description template, and the given placeholder replacement strings.
         *
         * @param {...string} replacement - error message placeholder replacement string
         * @returns {string} error message text for this ErrorMessage object and the given placeholder replacements
         *
         * @example <caption>Example of using the toString method on ErrorMessage object</caption>
         * var ILLEGAL_ARGUMENT = new services.ErrorMessage(1000, 'Illegal argument(s). $1');
         * ...
         * throw new Error(ILLEGAL_ARGUMENT.toString('Not a number!')); // "Oops! Illegal argument(s). Not a number! (#1000)"
         *
         * @public
         * @since 0.1.0
         */
        ErrorMessage.prototype.toString = function (var_args) {
            var desc = this.desc;
            for (var i = 0; i < arguments.length; i++)
                desc = desc.replace('$' + (i + 1), arguments[i]);
            return 'Oops! ' + desc + ' (#' + this.code + ')';
        };

        /**
         * Checks whether the given Error object has error code in its message property equal to the error code of this ErrorMessage object.
         *
         * @param {Error} error - Error object to check its error code
         * @returns {boolean} whether the given Error object has error code in its message property equal to the error code of this ErrorMessage object
         *
         * @example <caption>Example of using the isTypeOf method</caption>
         * var ILLEGAL_ARGUMENT = new services.ErrorMessage(1000, 'Illegal argument(s). $1');
         * try {
         *     throw new Error(ILLEGAL_ARGUMENT.toString('Not a number!'));
         * } catch (err){
         *     console.log(ILLEGAL_ARGUMENT.isTypeOf(err)); // true
         * }
         *
         * @public
         * @since 0.1.0
         */
        ErrorMessage.prototype.isTypeOf = function (error) {
            return error.message.indexOf('#' + this.code) !== -1;
        };

        registerType(ServiceType.FUNCTION, function (requests, config, serviceName) {
            var packed = [];
            for (var i = 0; i < requests.length; i++)
                packed.push(requests[i].body);

            var responses;
            try {
                responses = config.func(packed);
                if (!isArray_(responses) || responses.length !== requests.length)
                    throw new Error(Errors.ILLEGAL_RESPONSE_SIZE.toString());
            } catch (err) {
                rejectAll(requests, err);
                setServiceStatus(serviceName, 'offline');
                return;
            }
            resolveAllSuccessful(requests, responses);
            setServiceStatus(serviceName, 'online');
        });

        registerType(ServiceType.WORKER, function (requests, config, serviceName) {
            var packed = [];
            for (var i = 0; i < requests.length; i++)
                packed.push(requests[i].body);

            config.worker.postMessage(packed);

            config.worker.addEventListener('message', function (result) {
                var responses = result.data;
                if (!isArray_(responses) || responses.length !== requests.length)
                    rejectAll(requests, new Error(Errors.ILLEGAL_RESPONSE_SIZE.toString()));
                else
                    resolveAllSuccessful(requests, responses);
                setServiceStatus(serviceName, 'online');
            });
            config.worker.addEventListener('error', function (err) {
                rejectAll(requests, err);
                setServiceStatus(serviceName, 'offline');
            });
        });

        registerType(ServiceType.ASYNC_FUNCTION, function (requests, config, serviceName) {
            var packed = [];
            for (let i = 0; i < requests.length; i++)
                packed.push(requests[i].body);

            config.func(packed).then(function (responses) {
                try {
                    if (!isArray_(responses) || responses.length !== requests.length)
                        throw new Error(Errors.ILLEGAL_RESPONSE_SIZE.toString());
                } catch (err) {
                    rejectAll(requests, err);
                    return;
                }
                resolveAllSuccessful(requests, responses);
                setServiceStatus(serviceName, 'online');
            }, function (err) {
                rejectAll(requests, err);
                setServiceStatus(serviceName, 'offline');
            });
        });

        /**
         * Utility function that resolves promises of all given requests with corresponding responses.
         *
         * @memberof module:services
         * @param {Array.<Object>} requests - array of requests to resolve
         * @param {Array.<Object>} responses - array of responses to return
         * @public
         * @since 0.1.0
         * @static
         */
        function resolveAll(requests, responses) {
            for (var i = 0; i < responses.length; i++)
                requests[i].resolve(responses[i]);
        }

        /**
         * Utility function that rejects promises of all given requests with the given error.
         *
         * @memberof module:services
         * @param {Array.<Object>} requests - array of requests to reject
         * @param {Array.<Object>} err - an error to use when rejecting requests
         * @public
         * @since 0.1.0
         * @static
         */
        function rejectAll(requests, err) {
            for (var i = 0; i < requests.length; i++) {
                if (err instanceof Error)
                    requests[i].reject(err);
                else
                    requests[i].reject(new Error(err));
            }
        }

        /**
         * Utility function that resolves promise of each successfully handled request (response.success = true) within the given collection of requests with its corresponding response.
         * Rejects promise of each unsuccessfully handled request within the given collection of requests with the error from the corresponding response (response.error).
         *
         * @memberof module:services
         * @param {Array.<Object>} requests - array of requests to resolve
         * @param {Array.<Object>} responses - array of responses to return
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ERRONEOUS_RESPONSE]{@link module:services.Errors.ERRONEOUS_RESPONSE}
         */
        function resolveAllSuccessful(requests, responses) {
            for (var i = 0; i < responses.length; i++) {
                var request = requests[i],
                response = responses[i];
                if (response != null && response.success)
                    request.resolve(response);
                else if (response != null) {
                    var err = response.error;
                    if (err instanceof Error)
                        requests[i].reject(err);
                    else
                        requests[i].reject(new Error(err));
                } else
                    request.reject(new Error(Errors.ERRONEOUS_RESPONSE.toString()));
            }
        }

        /**
         * Sets the status of the service with the given name.
         *
         * @memberof module:services
         * @param {string} serviceName - the name of the service
         * @param {string} currentStatus - the status of the service with the given name
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function setServiceStatus(serviceName, currentStatus) {
            if (!isString_(serviceName))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceName is a string.'));
            if (!isString_(currentStatus))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure currentStatus is a string.'));

            if (serviceRegistry_[serviceName] != null)
                serviceStatusRegistry_[serviceName] = currentStatus;
        }

        /**
         * Returns the last status of the service with the given name.
         *
         * @memberof module:services
         * @param {string} serviceName - the name of the service
         * @returns {string} - the last status of the given service
         * @public
         * @since 0.1.0
         * @static
         * @throws {Error} [ILLEGAL_ARGUMENT]{@link module:services.Errors.ILLEGAL_ARGUMENT}
         */
        function getServiceStatus(serviceName) {
            if (!isString_(serviceName))
                throw new Error(Errors.ILLEGAL_ARGUMENT.toString('Make sure serviceName is a string.'));

            return serviceStatusRegistry_[serviceName];
        }

        /**
         * A collection of [ErrorMessage]{@link module:services.ErrorMessage} objects to use in appropriate erroneous situations.
         *
         * @memberof module:services
         * @namespace
         * @public
         * @readonly
         * @since 0.1.0
         * @static
         */
        var Errors = {
            /**
             * Usage: when function argument is not according to expectations. Error message (without $1 placeholder replaced and with the error code):
             * <p><i> 'Oops! Illegal argument(s). $1 (#2000)' </i>
             */
            ILLEGAL_ARGUMENT: new ErrorMessage(2000, 'Illegal argument(s). $1'),
            /**
             * Usage: in case of someone referring to an unexisting service. Error message (without $1 placeholder replaced and with the error code):
             * <p><i> 'Oops! The service with the given name has not been registered: $1. (#2001)' </i>
             */
            SERVICE_UNREGISTERED: new ErrorMessage(2001, 'The service with the given name has not been registered: $1.'),
            /**
             * Usage: in case of someone tries to register service with the name of an already existing service. Error message (without $1 placeholder replaced and with the error code):
             * <p><i> 'Oops! The service with the given name has already been registered: $1. (#2002)' </i>
             */
            SERVICE_ALREADY_REGISTERED: new ErrorMessage(2002, 'The service with the given name has already been registered: $1.'),
            /**
             * Usage: in case of service returns response of illegal size (not equal to the number of requests). Error message (with the error code):
             * <p><i> 'Oops! Make sure the service returns an array equally sized to the number of (logical) requests. (#2003)' </i>
             */
            ILLEGAL_RESPONSE_SIZE: new ErrorMessage(2003, 'Make sure the service returns an array equally sized to the number of (logical) requests.'),
            /**
             * Usage: in case of service returns bad response. Error message (without $1 placeholder replaced and with the error code):
             * <p><i> 'Oops! The service returned an erroneous response. $1 (#2004)' </i>
             */
            ERRONEOUS_RESPONSE: new ErrorMessage(2004, 'The service returned an erroneous response. $1')
        };

        /**
         * <p> Services API optimizes communication based on request-response paradigm between clients and server. Plus, it decouples clients from the server and enables them to be more powerful and yet independent and reusable.
         * <p> The key concept is a "service": a named facade that simplifies server's interface and handles communication. Each service is of certain type. A service type depends on the type of the server or the type of the channel used in communication, or both. Server can be an HTTP server, a Worker, a Capsule, or anything else able to handle clients' requests either synchronously or asynchronously.
         * <p> The workflow is the following. A named service is created with a service type appropriate for the desired communication. (If an appropriate service type does not exist, it could easily be created.) Clients send their requests to the service instead of to the target server. The service collects requests until it is asked to be flushed. When that happens, service packs requests into a single physical request, sends the physical request to the server, waits for the physical response, unpacks the physical response into individual responses, and finally delivers each individual response to the corresponding client.
         * <p> The primary goal of the services API is to optimize the use of communication channel, however, it indirectly provides more than that, namely:
         * <ul>
         * <li> The clients become unaware of physicalities of the server or the communication channel (or APIs that handle communication) since they only see the service.
         * <li> The server could easily be replaced with different implementation without affecting the clients' code.
         * <li> The stage is set for more powerful and yet independent and reusable clients i.e. clients tend to become more powerful because they take over their part of communication while keeping the potential to be reused.
         * </ul>
         * <p> Using Services API is useful when you have independent clients (unaware of each other's existence) sending requests to the same server and there is a requirement to have the requests sent through the communication channel as a whole (as a single physical request) or have them handled as a whole on the server side (or both). Also, it is useful when there is a need to decouple the clients from the specifics of communication channel or the server.
         * <p> To create (register) service use the [register]{@link module:services.register} function.
         * <p> To send request to a service use the [send]{@link module:services.send} function.
         * <p> To flush the service use the [flush]{@link module:services.flush} function.
         * <p> Each module has its own built-in service types: [services.js]{@link module:services.ServiceType}, [capsula.js]{@link module:capsula.ServiceType}, and [html.js]{@link module:html.ServiceType} service types. If there is no suitable service type within the collection of built-in service types, one can easily create new service type using [registerType]{@link module:services.registerType} function.
         *
         * @exports services
         * @version 0.1.0
         */
        var ns = {
            ServiceType: ServiceType,

            register: register,
            unregister: unregister,
            isRegistered: isRegistered,
            send: send,
            flush: flush,
            flushAll: flushAll,
            registerType: registerType,

            resolveAll: resolveAll,
            rejectAll: rejectAll,
            resolveAllSuccessful: resolveAllSuccessful,
            setServiceStatus: setServiceStatus,
            getServiceStatus: getServiceStatus,

            // error codes
            Errors: Errors,
            ErrorMessage: ErrorMessage
        };

        return ns;
    }));
