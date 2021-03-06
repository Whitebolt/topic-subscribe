//removeIf(node)
//removeIf(browser)
'use strict';
//endRemoveIf(browser)
//endRemoveIf(node)

/**
 * Turn the given value into an array.  If it is already an array then return it; if it is a set then convert to an
 * array; and if neither then return as the first item in an array. The purpose of this function is for function
 * or method parameters where they can be either a array or not.  You can use this to ensure you are working on
 * an array.
 *
 * @public
 * @param {Array|Set|*} value		Value to return or convert.
 * @returns {Array}					The converted value (or original if already an array).
 */
function makeArray(value) {
	if (value === undefined) return [];
	if (value instanceof Set) return [...value];
	return (Array.isArray(value)?value:[value]);
}

/**
 * Test whether the given value a string?
 *
 * @public
 * @param {*} value			Value to test.
 * @returns {boolean}		Is it a string?
 */
function isString(value) {
	return (typeof value === 'string');
}

/**
 * Is the given value a function.
 *
 * @public
 * @param {*} value			Value to test.
 * @returns {boolean}		Is it a function?
 */
function isFunction(value) {
	return !!(value && value.constructor && value.call && value.apply);
}

/**
 * Test whether the given value a standard object (and not null).
 *
 * @public
 * @param {*} value			Value to test.
 * @returns {boolean}		Is it an object?
 */
function isObject(value) {
	return ((Object.prototype.toString.call(value) === '[object Object]') && !(value === null));
}

/**
 * Is the given value a RegExp.
 *
 * @public
 * @param {*} value			Value to test.
 * @returns {boolean}		Is it a RegExp?
 */
function isRegExp(value) {
	return (value instanceof RegExp);
}

/**
 * Lop an item of the end of a string with the given separator.  The separator defaults to '/' for handling
 * file-like paths.
 *
 * @public
 * @param {string} text					Text to perform lop on.
 * @param {string} [separator='/']		The separator to use.
 * @returns {string}					Lopped string.
 */
function lop(text, separator='/') {
	const parts = text.split(separator);
	parts.pop();
	return parts.join(separator)
}

/**
 * Generator for given lop operation.
 *
 * @public
 * @generator
 * @param {string} text					Text to perform lopping on.
 * @param {string} [separator='/']		The separator to use.
 * @yields {string}						Lopped text.
 */
function* lopper(text, separator='/') {
	let _text = text;
	let last = _text;

	while (_text.length) {
		last = _text;
		yield _text;
		_text = lop(_text, separator='/');
	}
	if (last !== '/') yield '/';
}

/**
 * Get all the property names (including inherited) of the given object.
 *
 * @public
 * @param {Object} obj		The object to get properties for.
 * @returns {Set}			A set of all the property names.
 */
function getAllPropertyNames(obj) {
	const all = new Set();

	do {
		Object.getOwnPropertyNames(obj).forEach(property=>all.add(property));
	} while (obj = Object.getPrototypeOf(obj));

	return all;
}

/**
 * Perform a clone (with deep option) of given object.  Methods are bound to the cloned object.
 *
 * @note This will not clone getter/setters but only their value at clone time.  It does not climb the prototype chain,
 * so no inherited properties are cloned.
 *
 * @param {Object} obj				Object to clone.
 * @param {boolean} [deep=false]	Do a deep clone?
 * @returns {Object}				Cloned object.
 */
function clone(obj, deep=false) {
	const _obj = {};

	Object.getOwnPropertyNames(obj).forEach(property=>{
		if (isFunction(obj[property])) {
			_obj[property] = obj[property].bind(_obj);
		} else if (!deep || Array.isArray(obj[property]) || !isObject(obj[property])) {
			_obj[property] = obj[property];
		} else {
			_obj[property] = clone(obj[property], deep);
		}
	});

	return _obj;
}

//removeIf(node)
//removeIf(browser)
module.exports = {makeArray, isString, isFunction, isObject, isRegExp, getAllPropertyNames, lop, lopper, clone};
//endRemoveIf(browser)
//endRemoveIf(node)
