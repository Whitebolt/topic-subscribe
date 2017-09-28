/* jshint node: true, mocha: true */
/* global chai */


'use strict';

const packageInfo = require('../package.json');
const jsDoc = require('./index.json');
const PubSub = require('../');
const chai = require('chai');
const assert = chai.assert;


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
		throw new SyntaxError('Could not find the requested item: ' + itemName);
	}
}


describe(describeItem(packageInfo), ()=>{
	describe(describeItem(jsDoc, 'PubSub'), ()=>{
		describe(describeItem(jsDoc, 'PubSub#subscribe'), ()=>{
			const topics = new PubSub();
			it('The subscribe method should return a function.', ()=>{
				assert.isFunction(topics.subscribe("/my-test-channel", ()=>{}));
			});

			it('The subscribe method should throw if one or more channels not a string.', ()=>{
				assert.throws(()=>topics.subscribe(null, ()=>{}), TypeError);
				assert.throws(()=>topics.subscribe(true, ()=>{}), TypeError);
				assert.throws(()=>topics.subscribe(["test", null], ()=>{}), TypeError);
				assert.throws(()=>topics.subscribe(new Set(["test", "test2", {}]), ()=>{}), TypeError);
			});

			it('The subscribe method should throw if callback is not a function.', ()=>{
				assert.throws(()=>topics.subscribe("/my-test-channel", null), TypeError);
				assert.throws(()=>topics.subscribe("/my-test-channel", {}), TypeError);
			});

			it('The subscribe method should throw if filter is not an object.', ()=>{
				assert.throws(()=>topics.subscribe("/my-test-channel", null, ()=>{}), TypeError);
				assert.throws(()=>topics.subscribe("/my-test-channel", "filter me", ()=>{}), TypeError);
			});
		});

		describe(describeItem(jsDoc, 'PubSub#publish'), ()=>{
		});

		describe(describeItem(jsDoc, 'PubSub#broadcast'), ()=>{
		});
	});
});


