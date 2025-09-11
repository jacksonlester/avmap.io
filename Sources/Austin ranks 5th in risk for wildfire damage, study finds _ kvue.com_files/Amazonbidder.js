this.akamai = this.akamai || {};
this.akamai.amp = this.akamai.amp || {};
this.akamai.amp.amazonbidder = (function (exports) {
    'use strict';

    var Events = {
      BID_REQUEST: "request",
      COMPLETED: "completed",
      BID_RESPONSE: "response",
      ERROR: "error"
    };

    var Amazonbidder = /*#__PURE__*/function (_akamai$amp$Plugin) {
      babelHelpers.inherits(Amazonbidder, _akamai$amp$Plugin);
      function Amazonbidder(player, config) {
        var _this;
        babelHelpers.classCallCheck(this, Amazonbidder);
        _this = _akamai$amp$Plugin.call(this, player, config) || this;
        _this.player = player;
        _this.plugin = apstag || window.apstag;
        _this.adRequestTransformCallback = _this.adRequestTransformCallback.bind(babelHelpers.assertThisInitialized(_this));
        return _this;
      }
      babelHelpers.createClass(Amazonbidder, [{
        key: "slots",
        get: function get() {
          return this.data.slots;
        }
      }, {
        key: "onready",
        value: function onready() {
          if (!this.plugin || this.data.transformEnabled === false) return;
          this.init();
          this.player.addTransform(akamai.amp.TransformType.AD_REQUEST, this.adRequestTransformCallback);
        }
      }, {
        key: "adRequestTransformCallback",
        value: function adRequestTransformCallback(ad) {
          var _this2 = this;
          if (!this.plugin || this.data.transformEnabled === false) return ad;
          return this.getAdTag().then(function (data) {
            ad.request.adTagUrl += "&scp=".concat(data);
            return ad;
          })["catch"](function (error) {
            _this2.dispatch(Events.ERROR, {
              error: error
            });
            return ad;
          });
        }

        /** @override */
      }, {
        key: "getAdTag",
        value: function getAdTag() {
          var _this3 = this;
          return new Promise(function (resolve, reject) {
            _this3.sendRequest().then(function (bids) {
              var first = function first(element) {
                return !!element;
              };
              var exists = function exists(bid) {
                return bid.mediaType === 'video';
              };
              var bid = bids.filter(exists).find(first);
              var url = _this3.getQsParams(bid);
              _this3.dispatch(Events.COMPLETED, {
                url: url,
                bids: bids
              });
              resolve(encodeURIComponent(url));
            })["catch"](function (error) {
              return reject(error);
            });
          });
        }
      }, {
        key: "getQsParams",
        value: function getQsParams() {
          var bid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
            qsParams: ""
          };
          var encodedQsParams = !!this.data.encodedQsParams;
          var useDeals = !!this.data.deals;
          var target = useDeals ? bid.helpers : bid;
          var evaluate = function evaluate(value) {
            if (typeof value === 'function') return value.call();
            return value;
          };
          if (encodedQsParams && target.hasOwnProperty('encodedQsParams')) return evaluate(target.encodedQsParams);
          return evaluate(target.qsParams);
        }
      }, {
        key: "sendRequest",
        value: function sendRequest() {
          var _this4 = this;
          var slots = this.slots || [];
          var request = {
            slots: slots
          };
          this.dispatch(Events.BID_REQUEST, {
            request: request
          });
          return new Promise(function (resolve, reject) {
            _this4.plugin.fetchBids(request, function (bids) {
              this.dispatch(Events.BID_RESPONSE, {
                bids: bids
              });
              if (bids.length > 0) resolve(bids);else reject("No bids available");
            }.bind(_this4));
          });
        }
      }, {
        key: "init",
        value: function init() {
          if (!this.plugin) return;
          var data = this.data;
          var init = {
            pubID: data.pubID,
            videoAdServer: data.videoAdServer || data.adServer,
            bidTimeout: data.bidTimeout || Amazonbidder.BID_REQUEST_TIMEOUT,
            params: data.params || {},
            gdpr: data.gdpr || {},
            deals: !!data.deals
          };
          this.plugin.init(Object.assign(init, data.data));
        }
      }, {
        key: "dispatch",
        value: function dispatch(type, detail) {
          var event = new akamai.amp.Event(type, detail);
          this.dispatchEvent(event);
          this.logger.log("[AMP AMAZON BIDDER EVENT] ".concat(type), event);
        }
      }], [{
        key: "BID_REQUEST_TIMEOUT",
        get: function get() {
          return 2000;
        }
      }]);
      return Amazonbidder;
    }(akamai.amp.Plugin);

    akamai.amp.AMP.registerPlugin("amazonbidder", typeof akamai.amp.Plugin.createFactory == 'function' ? akamai.amp.Plugin.createFactory(Amazonbidder) : Amazonbidder.factory);

    exports.Amazonbidder = Amazonbidder;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
