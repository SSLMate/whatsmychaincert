/*
 * Copyright (C) 2014 Opsmate, Inc.
 *
 * See COPYING file for license information.
 */
var		whatsmychaincert_endpoint;
var		current_test_host = null;

var		create_element;

if (typeof(document.createElementNS) == "function" && document.documentElement.namespaceURI)
	create_element = function (name) { return document.createElementNS(document.documentElement.namespaceURI, name); };
else
	create_element = function (name) { return document.createElement(name); }

var		has_push_state = ("pushState" in history) && typeof(history.pushState) == "function" &&
	                        ("replaceState" in history) && typeof(history.replaceState) == "function";

function add_class (element, className)
{
	if (!has_class(element, className)) {
		if (element.className) element.className += " " + className;
		else element.className = className;
	}
}

function remove_class (element, className)
{
	var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
	element.className = element.className.replace(regexp, "$2");
}

function has_class (element, className)
{
	var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
	return regexp.test(element.className);
}

function canonical_url (test_host)
{
	var url = location.protocol + "//" + location.host + location.pathname;
	if (test_host) {
		url += "?" + encodeURI(test_host);
	}
	return url;
}

function add_test_result (host, ip_address, type, text)
{
	var results = document.getElementById("test_results");

	var result = create_element("p");
	var host_span = create_element("span");
	host_span.className = "result_host";
	host_span.appendChild(document.createTextNode(host));
	result.appendChild(host_span);
	if (ip_address) {
		result.appendChild(document.createTextNode(" ("));
		var ip_address_span = create_element("span");
		ip_address_span.className = "result_ip_address";
		ip_address_span.appendChild(document.createTextNode(ip_address));
		result.appendChild(ip_address_span);
		result.appendChild(document.createTextNode(")"));
	}
	if (type == "trusted") {
		result.appendChild(document.createTextNode(" is "));
		var trusted_span = create_element("span");
		trusted_span.className = "result_trusted";
		trusted_span.appendChild(document.createTextNode("good"));
		result.appendChild(trusted_span);
		result.appendChild(document.createTextNode("."));
	} else if (type == "untrusted") {
		result.appendChild(document.createTextNode(" is "));
		var untrusted_span = create_element("span");
		untrusted_span.className = "result_untrusted";
		untrusted_span.appendChild(document.createTextNode("misconfigured"));
		result.appendChild(untrusted_span);
		result.appendChild(document.createTextNode(". "));
		var a = create_element("a");
		a.href = whatsmychaincert_endpoint + "/generate?host=" + encodeURIComponent(host);
		if (ip_address) {
			a.href += ";ip_address=" + encodeURIComponent(ip_address);
		}
		a.appendChild(document.createTextNode("This"));
		result.appendChild(a);
		result.appendChild(document.createTextNode(" is the chain it should be using."));
	} else if (type == "error") {
		result.appendChild(document.createTextNode(": "));
		var error_span = create_element("span");
		error_span.className = "result_error";
		error_span.appendChild(document.createTextNode(text));
		result.appendChild(error_span);
	}

	results.appendChild(result);
	add_class(results, "has_results");
}

function clear_test_results ()
{
	var results = document.getElementById("test_results");
	while (results.hasChildNodes()) {
		results.removeChild(results.firstChild);
	}
	remove_class(results, "has_results");
}

function handle_test_results (host, result)
{
	var all_trusted = true;
	var all_untrusted = true;
	var has_errors = false;
	for (var i = 0; i < result.length; ++i) {
		if ("trusted" in result[i]) {
			all_trusted = all_trusted && result[i].trusted;
			all_untrusted = all_untrusted && !result[i].trusted;
		} else {
			has_errors = true;
		}
	}
	clear_test_results();
	if (!has_errors && all_trusted && !all_untrusted) {
		add_test_result(host, null, "trusted");
	} else if (!has_errors && all_untrusted && !all_trusted) {
		add_test_result(host, null, "untrusted");
	} else {
		for (var i = 0; i < result.length; ++i) {
			if ("trusted" in result[i]) {
				if (result[i].trusted) {
					add_test_result(host, result[i].ip_address, "trusted");
				} else {
					add_test_result(host, result[i].ip_address, "untrusted");
				}
			} else {
				add_test_result(host, result[i].ip_address, "error", result[i].error);
			}
		}
	}
}

function handle_test_error (message)
{
	clear_test_results();

	var results = document.getElementById("test_results");
	var result = create_element("p");
	result.className = "test_error";
	result.appendChild(document.createTextNode(message));
	results.appendChild(result);
	add_class(results, "has_results");
}

function test_form_submit (form)
{
	var host = form.host.value;
	if ("trim" in String.prototype) { // not supported before IE9
		host = host.trim();
	}
	var re = /^https?:\/\/([^\/]*)/;
	var match = re.exec(host);
	if (match) {
		host = match[1];
	}
	if (host == "") {
		return false;
	}
	if (has_push_state) {
		history.pushState(host, null, canonical_url(host));
	}
	do_test(host);
	return false;
}

function do_test (host)
{
	var uri = whatsmychaincert_endpoint + "/test?host=" + encodeURIComponent(host);
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4) {
			if (host != current_test_host) {
				return;
			}
			if (xhr.status != 200) {
				handle_test_error(xhr.responseText);
			} else if (xhr.getResponseHeader("Content-Type") != "application/json") {
				handle_test_error("Received an unexpected response from the server.");
			} else {
				handle_test_results(host, eval("(" + xhr.responseText + ")"));
			}
		}
	};
	current_test_host = host;
	xhr.open("GET", uri);
	xhr.send();
}

function select_configguide_snippet (snippet)
{
	var cg = document.getElementById('configguide');
	var nd = cg.firstChild;
	for (;nd; nd = nd.nextSibling) {
		if (nd.nodeName.toLowerCase() == "div" && has_class(nd, "configguide_snippet")) {
			if (has_class(nd, "configguide_snippet_" + snippet)) {
				add_class(nd, "configguide_snippet_selected");
			} else {
				remove_class(nd, "configguide_snippet_selected");
			}
		}
	}
}

function restore_state (test_host)
{
	var test_form = document.getElementById('test_form');
	if (test_host) {
		test_form.host.value = test_host;
		do_test(test_host);
	} else {
		test_form.reset();
		clear_test_results();
	}
	if (has_push_state) {
		history.replaceState(test_host, null, canonical_url(test_host));
	}
}

window.onload = function ()
{
	var cg = document.getElementById('configguide');
	select_configguide_snippet(cg.snippet.value);
	restore_state(location.search ? decodeURI(location.search.substr(1)) : null);
}
window.onpopstate = function (ev)
{
	restore_state(ev.state);
}
