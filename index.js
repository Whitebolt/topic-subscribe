'use strict';

const isNode = (()=>{
	try {
		return (module && module.exports);
	} catch (err){
		return false;
	}
})();

const sift = require('sift');
const Private = isNode?require("./lib/Private"):window.topic.Private;
const {makeArray, isString, isFunction, isObject, isRegExp, lopGen} = isNode?require("./lib/util"):window.topic;
const createError = isNode?require("./lib/errors"):window.topic.createError;

/**
 * Apply a given action on a given set, against a given channel with the given subscription.
 *
 * @param {Set} subscriptions				The subscriptions to work on.
 * @param {string} channel					The channel to apply this with.
 * @param {string} action					The action to do.
 * @param {object} subscription				The subscription object to apply.
 */
function _subscriptionAction(subscriptions, channel, action, subscription) {
	if (!subscriptions.has(channel)) subscriptions.set(channel, new Set());
	subscriptions.get(channel)[action](subscription);
}

/**
 * Perform a give action on all on the channels supplied using the subscription value supplied.  This is basically, a
 * way of performing the same action on a sets (eg. add or delete).
 *
 * @private
 * @param {Set} subscriptions				The subscriptions to work on.
 * @param {Array.<string|RegExp} channels	The channels to apply this with.
 * @param {string} action					The action to do.
 * @param {object} subscription				The subscription object to apply.
 */
function _subscriptionsAction(subscriptions, channels, action, subscription) {
	channels.forEach(channel=>_subscriptionAction(subscriptions, channel, action, subscription));
}

/**
 * Test an array of channels returning true if all channels are correct type and format.  Returns false if any of the
 * channels fail the criteria.
 *
 * @private
 * @param {Array<string|RegExp} channels	Channels to test.
 * @param {boolean} allowRegExp				Do we allow regular expressions for channels?
 * @returns {boolean}						Did they all pass?
 */
function _allChannelsAreCorrectType(channels, allowRegExp=true) {
	return (channels.filter(channel=>
		(isString(channel) ? (channel.charAt(0) === '/') : (allowRegExp?isRegExp(channel):false))
	).length === channels.length);
}

/**
 * Generator for all ancestor channels of a given array of channels.
 *
 * @param {Array.<string>} channels		Channels to expand.
 */
function* allAncestorChannels(channels) {
	const loppers = channels.map(channel=>lopGen(channel)());

	while (true) {
		let done = 0;
		for(let n=0; n<loppers.length; n++) {
			let value = loppers[n].next();
			if (!value.done) {
				yield value.value;
			} else {
				done++;
			}
		}
		if (done >= loppers.length) break;
	}
}

/**
 * Get an array of unique ancestor channels from array of channels.
 *
 * @private
 * @param {Array.<string>} channels		Channels array.
 * @returns {Array.<string>}			All calculated channels.
 */
function _uniqueChannels(channels) {
	const uniqueChannels = new Set();

	const lopper = allAncestorChannels(channels);
	for(let channel of lopper) uniqueChannels.add(channel);

	return Array.from(uniqueChannels);
}

/**
 * Take a channel string and trim any trailing slashes or empty channel parts.
 *
 * @private
 * @param {sgtring} channel		Thr channel to trim.
 * @returns {string}			The trimmed channel.
 */
function _removingTrailingSlash(channel) {
	return (
		(isString(channel) && (channel.charAt(0) === '/')) ?
			'/'+channel.split('/').filter(part=>(part.trim() !== '')).join('/'):
			channel
	);
}

/**
 * Subscribe to the given channels with the supplied listener and filter. Will use the supplied listener subscription
 * map to set listeners.
 *
 * @private
 * @param {Map} subscriptions										The listener subscriptions to subscribe on.
 * @param {Array.<string|RegExp>|Set.<string|RegExp>} channels		The channels to subscribe to.
 * @param {Object} filter											The sift filter to use.
 * @param {Function} callback										The listener to fire when messages received.
 * @returns {Function}												Unsubscribe function.
 */
function _subscribe(subscriptions, channels, filter, callback) {
	if (!isFunction(callback)) throw createError(TypeError, 'CallbackNotFunction');
	if (!isObject(filter)) throw createError(TypeError, 'FilterNotAnObject');
	if (!_allChannelsAreCorrectType(channels)) throw createError(TypeError, 'ChannelNotAString');

	const subscription = {callback, filter};
	_subscriptionsAction(subscriptions, channels, 'add', subscription);
	return ()=>_subscriptionsAction(subscriptions, channels, 'delete', subscription);
}

/**
 * Publish a message to the given listeners on the given channels.
 *
 * @param {Map} subscriptions			The listener subscriptions to publish to.
 * @param {Array.<string>} channels		The channels to publish on.
 * @param {*} message					The publish message.
 * @returns {boolean}					Did any listeners receive the message.
 */
function _publish(subscriptions, channels, message) {
	const _callbacks = new Set();

	subscriptions
		.forEach((callbacks, subscriptionChannel)=>{
			channels.filter(channel=>{
				if (isRegExp(subscriptionChannel)) return subscriptionChannel.test(channel);
			}).forEach(()=>{
				callbacks.forEach(callback=>{
					if (sift(callback.filter, [message]).length) _callbacks.add(callback.callback);
				})
			});
		});

	channels.forEach(channel=>{
		if (subscriptions.has(channel)) {
			subscriptions.get(channel).forEach(subscription=>{
				if (sift(subscription.filter, [message]).length) _callbacks.add(subscription.callback);
			});
		}
	});

	_callbacks.forEach(callback=>callback(
		new Event(message, Object.freeze(channels))
	));

	return !!_callbacks.size;
}

/**
 * Broadcast a message to the given listeners on the given channels.
 *
 * @param {Map} subscriptions			The listener subscriptions to broadcast to.
 * @param {Array.<string>} channels		The channels to broadcast on.
 * @param {*} message					The broadcast message.
 * @returns {boolean}					Did any listeners receive the message.
 */
function _broadcast(subscriptions, channels, message) {
	const _callbacks = new Set();

	subscriptions
		.forEach((callbacks, subscriptionChannel)=>{
			channels.filter(channel=>{
				if (isRegExp(subscriptionChannel)) return false;
				return (subscriptionChannel.substr(0, channel.length) === channel)
			}).forEach(()=>{
				callbacks.forEach(callback=>{
					if (sift(callback.filter, [message]).length) _callbacks.add(callback.callback);
				})
			});
		});

	_callbacks.forEach(callback=>callback(
		new Event(message, Object.freeze(channels))
	));

	return !!_callbacks.size;
}

/**
 * Event class, this is the class that is passed to listeners, it contains all the given data and other event style
 * information that might be useful.  Each listener get's it's own instance of the class.
 *
 * @class
 */
class Event {
	/**
	 * Create a new event instance.
	 *
	 * @method
	 * @param {*} message			The message being published/broadcast.
	 * @param {string} target		The target channel being published/broadcast to.
	 */
	constructor(message, target) {
		Private.set(this, 'data', message);
		Private.set(this, 'target', target);
	}

	/**
	 * The message data.
	 *
	 * @public
	 * @property
	 * @returns {*}
	 */
	get data() {
		return Private.get(this, 'data');
	}

	/**
	 * The original channel this was published/broadcast to.
	 *
	 * @public
	 * @property
	 * @returns {string}
	 */
	get target() {
		return Private.get(this, 'target');
	}
}


/**
 * Publish and Subscription class.
 *
 * @public
 * @class
 */
class PubSub {
	constructor() {

	}

	/**
	 * Subscribe to information published on a given channel(s) path with optional filtering. If a regular-expression is
	 * given for a channel it will receive published data but not broadcast data.
	 *
	 * @public
	 * @method
	 * @param {string|RegExp|Array.<string|RegExp>|Set.<string|RegExp>} channel		Channel(s) to subscribe to
	 * 																				(including glob-style patterns).
	 * @param {Object} [filter]														Filter to filter-out messages that
	 * 																				are not wanted.
	 * @param {Function} callback													Callback for caught messages.
	 * @returns {Function}															Unsubscribe function.
	 */
	subscribe(channel, filter, callback) {
		return _subscribe(
			Private.get(this, 'channels', Map),
			makeArray(channel).map(channel=>_removingTrailingSlash(channel)),
			callback?filter:{},
			callback?callback:filter
		);
	}

	/**
	 * Publish a message to the given channel(s). Publishing causes a message to be read on given channel and all
	 * parent channels.
	 *
	 * @public
	 * @method
	 * @param {string|Array|set} channel		Channel(s) to publish on (including glob-style patterns).
	 * @param {*} message						Message to publish.
	 * @returns {boolean}						Did the message publish?
	 */
	publish(channel, message) {
		const channels = makeArray(channel).map(channel=>_removingTrailingSlash(channel));
		if (!_allChannelsAreCorrectType(channels, false)) throw createError(TypeError, 'ChannelNotAString');
		return _publish(
			Private.get(this, 'channels', Map),
			_uniqueChannels(channels),
			message
		);
	}

	/**
	 * Broadcast a message to the given channel(s). Broadcasting causes a message to be read on given channel and all
	 * descendant channels. Will not be read on channel subscriptions that are regular-expressions.
	 *
	 * @public
	 * @method
	 * @param {string|Array|set} channel		Channel(s) to publish on (including glob-style patterns).
	 * @param {*} message						Message to publish.
	 * @returns {boolean}						Did the message publish?
	 */
	broadcast(channel, message) {
		const channels = makeArray(channel).map(channel=>_removingTrailingSlash(channel));
		if (!_allChannelsAreCorrectType(channels, false)) throw createError(TypeError, 'ChannelNotAString');
		return _broadcast(
			Private.get(this, 'channels', Map),
			channels,
			message
		);
	}
}

module.exports = PubSub;
