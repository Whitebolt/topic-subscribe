/* jshint node: true, mocha: true */
/* global chai */

//removeIf(browser)
'use strict';

const packageInfo = require(process.cwd()+'/package.json');
const jsDoc = tryRequire('./index.json');
const PubSub = require(process.cwd());
const chai = require('chai');
const assert = chai.assert;

function tryRequire(moduleId, defaultValue) {
	try {
		return require(moduleId);
	} catch(err) {
		return ((defaultValue !== undefined)?defaultValue:{});
	}
}
//endRemoveIf(browser)

let counter = 0;

/**
 * Generate a description for a describe clause using the info in an object.
 *
 * @private
 * @param {Object} items        The object to get a description from.
 * @param {string} [itemName]   If supplied the property of items to get from.
 * @returns {string}
 */
function describeItem(items, itemName) {
	try {
		if (itemName) return items[itemName].name + '(): ' + items[itemName].description;
		return items.name + ': ' + items.description;
	} catch(err) {
		return '';
	}
}

function getPubSubInstance() {
	try {
		return new PubSub();
	} catch (err) {
		return $("#mocha").pubsub(counter++);
	}
}

function runner() {
	describe(describeItem(packageInfo), ()=>{
		describe(describeItem(jsDoc, 'PubSub'), ()=>{
			describe(describeItem(jsDoc, 'PubSub#subscribe'), ()=>{
				const topics = getPubSubInstance();

				//removeIf(browser)
				it('The subscribe method should return a function.', ()=>{
					assert.isFunction(topics.subscribe('/my-test-channel', ()=>{}));
				});
				//endRemoveIf(browser)

				//removeIf(node)
				it('The subscribe method should return a jQuery-style object.', ()=>{
					assert.instanceOf(topics.subscribe('/my-test-channel', ()=>{}), $);
					assert.isFunction(topics.subscribe('/my-test-channel', ()=>{}).on);
					assert.isFunction(topics.subscribe('/my-test-channel', ()=>{}).trigger);
					assert.isFunction(topics.subscribe('/my-test-channel', ()=>{}).filter);
				});
				//endRemoveIf(node)

				describe('Subscribe should throw if wrong types supplied', ()=>{
					it('The subscribe method should throw if one or more channels not a string.', ()=>{
						assert.throws(()=>topics.subscribe(null, ()=>{}), TypeError);
						assert.throws(()=>topics.subscribe(true, ()=>{}), TypeError);
						assert.throws(()=>topics.subscribe(['/test', null], ()=>{}), TypeError);
						assert.throws(()=>topics.subscribe(new Set(['/test', '/test2', {}]), ()=>{}), TypeError);
						assert.throws(()=>topics.subscribe('test', ()=>{}), TypeError);
						assert.doesNotThrow(()=>topics.subscribe('/test', ()=>{}), TypeError);
					});

					it('The subscribe method should throw if callback is not a function.', ()=>{
						assert.throws(()=>topics.subscribe('/test', null), TypeError);
						assert.throws(()=>topics.subscribe('/test', {}), TypeError);
					});

					it('The subscribe method should throw if filter is not an object.', ()=>{
						assert.throws(()=>topics.subscribe('/test', null, ()=>{}), TypeError);
						assert.throws(()=>topics.subscribe('/test', 'filter me', ()=>{}), TypeError);
					});
				});

				//removeIf(browser)
				it('Subscribe should return a useable unsubscribe function.', ()=>{
					const topics = getPubSubInstance();

					let called = false;
					const unsubscribe = topics.subscribe('/test', ()=>{
						called = true;
					});
					unsubscribe();

					topics.publish('/test', 'TEST MESSAGE');
					assert.isFalse(called, 'Subscription not fired.');
				});
				//endRemoveIf(browser)

				it('Subscribe should subscribe to multiple channels when given arrays.', ()=> {
					const topics = getPubSubInstance();

					let called = 0;
					topics.subscribe(['/test', '/extra', '/more'], ()=>{
						called++;
					});

					topics.publish('/test', 'TEST MESSAGE');
					assert.isTrue(!!called, 'Subscription not fired.');
					assert.equal(called, 1);
					topics.publish('/more', 'TEST MESSAGE');
					topics.publish('/extra', 'TEST MESSAGE');
					assert.equal(called, 3);
				});

				it('Subscribe should subscribe to multiple channels when given sets.', ()=> {
					const topics = getPubSubInstance();

					let called = 0;
					topics.subscribe(new Set(['/test', '/extra', '/more']), ()=>{
						called++;
					});

					topics.publish('/test', "TEST MESSAGE");
					assert.isTrue(!!called, "Subscription not fired.");
					assert.equal(called, 1);
					topics.publish('/more', "TEST MESSAGE");
					topics.publish('/extra', "TEST MESSAGE");
					assert.equal(called, 3);
				});

				it('Subscribe should subscribe to multiple channels when given an array/set of mixed strings and regular expressions - these should fire up the tree. Each callback should fire once.', ()=> {
					const topics = getPubSubInstance();

					let called = 0;
					topics.subscribe(new Set(['/test', /test\/(?:extra|more)\//]), ()=>{
						called++;
					});

					topics.publish('/test', 'TEST MESSAGE');
					assert.isTrue(!!called, 'Subscription not fired.');
					assert.equal(called, 1);
					topics.publish('/test/more/extreme', 'TEST MESSAGE');
					topics.publish('/test/extra/extreme', 'TEST MESSAGE');
					assert.equal(called, 3);
					topics.publish('/test/extreme', 'TEST MESSAGE');
					assert.equal(called, 4);
				});
			});

			describe(describeItem(jsDoc, 'PubSub#publish'), ()=>{
				const topics = getPubSubInstance();

				//removeIf(browser)
				it('The publish method should return a boolean.', ()=>{
					assert.isBoolean(topics.publish('/my-test-channel', {}));
				});
				//endRemoveIf(browser)

				//removeIf(node)
				it('The publish method should return a jQuery style object.', ()=>{
					assert.instanceOf(topics.publish('/my-test-channel', {}), $);
					assert.isFunction(topics.publish('/my-test-channel', {}).on);
					assert.isFunction(topics.publish('/my-test-channel', {}).trigger);
					assert.isFunction(topics.publish('/my-test-channel', {}).filter);
				});
				//removeIf(node)

				describe('Publish should throw if wrong types supplied.', ()=>{
					it('The publish method should throw if one or more channels not a string.', ()=>{
						assert.throws(()=>topics.publish(null, {}), TypeError);
						assert.throws(()=>topics.publish(true, {}), TypeError);
						assert.throws(()=>topics.publish(['/test', null], {}), TypeError);
						assert.throws(()=>topics.publish(new Set(['/test', '/test2', {}]), {}), TypeError);
						assert.throws(()=>topics.publish('test', {}), TypeError);
						assert.throws(()=>topics.publish(/test/, {}), TypeError);
						assert.throws(()=>topics.publish(['/test', /test/], {}), TypeError);
						assert.doesNotThrow(()=>topics.publish('/test', {}), TypeError);
					});
				});

				describe('Published messages should be sent to subscribers on same or matching channels.', ()=>{
					it('Subscribed callbacks should fire when message sent on same channel.', ()=>{
						const topics = getPubSubInstance();
						let called = false;
						topics.subscribe('/test', message=>{
							called = true;
							assert.equal(message.data, 'TEST MESSAGE');
						});

						topics.publish('/test', 'TEST MESSAGE');
						assert.isTrue(called, 'Subscription not fired.');
					});

					it('Subscribed callbacks should fire up channel tree.', ()=>{
						const topics = getPubSubInstance();
						let called = 0;

						['/test/extra/extreme', '/test/extra', '/test', '/'].forEach(channel=>{
							topics.subscribe(channel, message=>{
								called++;
								assert.equal(message.data, 'TEST MESSAGE');
							});
						});

						topics.publish('/test/extra/extreme', 'TEST MESSAGE');
						assert.isTrue(!!called, 'Subscription not fired.');
						assert.equal(called, 4, 'Subscriptions did not fire up tree.');
					});

					it('Subscribed callbacks should fire when more than one channel is published on.', ()=>{
						const topics = getPubSubInstance();
						let called = 0;

						[
							'/test/extra/extreme',
							'/test/extra',
							'/test',
							'/',
							'/test/extra/extra-extreme'
						].forEach(channel=>{
							topics.subscribe(channel, message=>{
								called++;
								assert.equal(message.data, 'TEST MESSAGE');
							});
						});

						topics.publish([
							'/test/extra/extreme',
							'/test/extra/extra-extreme'
						], 'TEST MESSAGE');
						assert.isTrue(!!called, 'Subscription not fired.');
						assert.equal(called, 5, 'Subscriptions did not fire up tree.');
					});

					it('Subscribed callbacks should fire in deepest first order when firing up tree.', ()=>{
						const topics = getPubSubInstance();
						let called = 0;

						topics.subscribe('/', ()=>{
							assert.equal(called, 3);
							called++;
						});
						topics.subscribe('/test/extra/extreme', ()=>{
							assert.equal(called, 0);
							called++;
						});
						topics.subscribe('/test', ()=>{
							assert.equal(called, 2);
							called++;
						});
						topics.subscribe('/test/extra', ()=>{
							assert.equal(called, 1);
							called++;
						});

						topics.publish('/test/extra/extreme', 'TEST MESSAGE');
					});

					it('Subscribed callbacks should fire on RegExp channel matchers.', ()=>{
						const topics = getPubSubInstance();
						let called = 0;
						topics.subscribe(/test\/(?:extra|more)\//, message=>{
							called++;
							assert.equal(message.data, 'TEST MESSAGE');
						});

						topics.publish('/test/extra/extreme', 'TEST MESSAGE');
						topics.publish('/test/more/extreme', 'TEST MESSAGE');
						topics.publish('/test/zero/extreme', 'TEST MESSAGE');
						topics.publish('/test/more', 'TEST MESSAGE');
						assert.isTrue(!!called, 'Subscription not fired.');
						assert.equal(called, 2, 'Subscriptions did not fire on RegExp matches.');
					});
				});


				it('Filters should be applied when given, according to the sift rules.', ()=>{
					const topics = getPubSubInstance();
					let called = 0;

					topics.subscribe('/test', {priority:{$gt:2}}, message=>{
						called++;
					});

					topics.publish('/test/extra/extreme', {
						priority: 4,
						description: "Message at level 4"
					});

					topics.publish('/test/extra/extreme', {
						priority: 3,
						description: "Message at level 3"
					});

					topics.publish('/test/extra/extreme', {
						priority: 1,
						description: "Message at level 1"
					});

					assert.equal(called, 2, 'Filter did not run correctly.');
				});

				//removeIf(browser)
				it('Publish should return whether a callback was fired.', ()=>{
					const topics = getPubSubInstance();

					topics.subscribe('/test', message=>{});

					assert.isTrue(topics.publish('/test', 'TEST MESSAGE'));
					assert.isFalse(topics.publish('/extra', 'TEST MESSAGE'));
				});
				//endRemoveIf(browser)
			});

			describe(describeItem(jsDoc, 'PubSub#broadcast'), ()=> {
				const topics = getPubSubInstance();

				//removeIf(browser)
				it('The broadcast method should return a boolean.', ()=>{
					assert.isBoolean(topics.broadcast('/test', {}));
				});
				//endRemoveIf(browser)

				//removeIf(node)
				it('The vroadcast method should return a jQuery-style object.', ()=>{
					assert.instanceOf(topics.broadcast('/my-test-channel', ()=>{}), $);
					assert.isFunction(topics.broadcast('/my-test-channel', {}).on);
					assert.isFunction(topics.broadcast('/my-test-channel', {}).trigger);
					assert.isFunction(topics.broadcast('/my-test-channel', {}).filter);
				});
				//endRemoveIf(node)

				describe('Broadcast should throw if wrong types supplied.', ()=>{
					it('The broadcast method should throw if one or more channels not a string.', ()=>{
						assert.throws(()=>topics.publish(null, {}), TypeError);
						assert.throws(()=>topics.publish(true, {}), TypeError);
						assert.throws(()=>topics.publish(['/test', null], {}), TypeError);
						assert.throws(()=>topics.publish(new Set(['/test', '/test2', {}]), {}), TypeError);
						assert.throws(()=>topics.publish('test', {}), TypeError);
						assert.throws(()=>topics.publish(/test/, {}), TypeError);
						assert.throws(()=>topics.publish(['/test', /test/], {}), TypeError);
						assert.doesNotThrow(()=>topics.publish('/test', {}), TypeError);
					});
				});

				describe('Broadcast messages should be sent to subscribers on same or matching channels.', ()=> {
					const topics = getPubSubInstance();

					it('Subscribed callbacks should fire when message broadcast on same channel.', ()=>{
						let called = false;
						topics.subscribe('/test/extra/extreme', message=>{
							called = true;
							assert.equal(message.data, 'TEST MESSAGE');
						});

						topics.broadcast('/test/extra/extreme', 'TEST MESSAGE');
						assert.isTrue(called, 'Subscription not fired.');
					});

					it('Subscribed callbacks should fire when message broadcast on ancestor channel.', ()=>{
						let called = 0;
						topics.subscribe('/test/extra/extreme', message=>{
							called++;
							assert.equal(message.data, 'TEST MESSAGE');
						});
						topics.subscribe(['/test/extra/more', '/test/more/extra'], message=>{
							called++;
							assert.equal(message.data, 'TEST MESSAGE');
						});

						topics.broadcast('/test', 'TEST MESSAGE');
						assert.isTrue(!!called, 'Subscription not fired.');
						assert.equal(called, 2);
					});

					//removeIf(browser)
					it('Broadcast should return whether a callback was fired.', ()=>{
						const topics = getPubSubInstance();

						topics.subscribe('/test/extra/extreme', ()=>{});

						assert.isTrue(topics.broadcast('/test', 'TEST MESSAGE'));
						assert.isTrue(topics.broadcast('/test/extra', 'TEST MESSAGE'));
						assert.isFalse(topics.broadcast('/extra', 'TEST MESSAGE'));
						assert.isTrue(topics.broadcast('/', 'TEST MESSAGE'));
					});
					//endRemoveIf(browser)
				});

				it('Subscribed callbacks should fire when message broadcast on ancestor channel and filter matches.', ()=>{
					const topics = getPubSubInstance();
					let called = 0;
					topics.subscribe('/test/extra/extreme', {priority: {$lt: 3}}, ()=>{
						called++;
					});
					topics.subscribe(['/test/extra/more', '/test/more/extra'], {priority: {$gt: 1}}, ()=>{
						called++;
					});

					topics.broadcast('/test', {
						priority: 1,
						description: 'Message priority 1'
					});
					assert.equal(called, 1);
				});
			});
		});
	});

	//removeIf(node)
	mocha.run();
	//endRemoveIf(node)
}

//removeIf(browser)
runner();
//endRemoveIf(browser)