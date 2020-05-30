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

function add_testing_message (host)
{
	var p = create_element("p");
	p.appendChild(document.createTextNode("Testing " + host + "... "));

	var cancel_link = create_element("a");
	cancel_link.href = "javascript:void(0);";
	cancel_link.onclick = function() { cancel_test(); };
	cancel_link.appendChild(document.createTextNode("Cancel"));
	p.appendChild(cancel_link);

	clear_test_results();
	document.getElementById("test_results").appendChild(p);
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
		result.appendChild(document.createTextNode(" has the "));
		var trusted_span = create_element("span");
		trusted_span.className = "result_trusted";
		trusted_span.appendChild(document.createTextNode("correct"));
		result.appendChild(trusted_span);
		result.appendChild(document.createTextNode(" chain."));
	} else if (type == "trusted_but_expired_chain") {
		result.appendChild(document.createTextNode(" has a trusted chain containing an "));
		var span = create_element("span");
		span.className = "result_trusted_but_expired_chain";
		span.appendChild(document.createTextNode("expired certificate"));
		result.appendChild(span);
		result.appendChild(document.createTextNode(". This chain will work with modern web browsers but "));
		var a = create_element("a");
		a.href = "https://www.agwa.name/blog/post/fixing_the_addtrust_root_expiration";
		a.appendChild(document.createTextNode("may fail with older clients"));
		result.appendChild(a);
		result.appendChild(document.createTextNode(", notably OpenSSL 1.0.x.  "));
		a = create_element("a");
		a.href = whatsmychaincert_endpoint + "/generate?include_leaf=1;host=" + encodeURIComponent(host);
		if (ip_address) {
			a.href += ";ip_address=" + encodeURIComponent(ip_address);
		}
		a.appendChild(document.createTextNode("Download a chain without the expired certificate"));
		result.appendChild(a);
	} else if (type == "expired") {
		result.appendChild(document.createTextNode(" is "));
		var expired_span = create_element("span");
		expired_span.className = "result_expired";
		expired_span.appendChild(document.createTextNode("expired"));
		result.appendChild(expired_span);
		result.appendChild(document.createTextNode(". It won't be trusted by clients regardless of its chain."));
	} else if (type == "self_signed") {
		result.appendChild(document.createTextNode(" is "));
		var self_signed_span = create_element("span");
		self_signed_span.className = "result_self_signed";
		self_signed_span.appendChild(document.createTextNode("self-signed"));
		result.appendChild(self_signed_span);
		result.appendChild(document.createTextNode(". It doesn't have a chain certificate and will never be trusted by clients."));
	} else if (type == "untrusted") {
		result.appendChild(document.createTextNode(" is "));
		var untrusted_span = create_element("span");
		untrusted_span.className = "result_untrusted";
		untrusted_span.appendChild(document.createTextNode("misconfigured"));
		result.appendChild(untrusted_span);
		result.appendChild(document.createTextNode(". "));
		var a = create_element("a");
		a.href = whatsmychaincert_endpoint + "/generate?include_leaf=1;host=" + encodeURIComponent(host);
		if (ip_address) {
			a.href += ";ip_address=" + encodeURIComponent(ip_address);
		}
		a.appendChild(document.createTextNode("This"));
		result.appendChild(a);
		result.appendChild(document.createTextNode(" is the chain it should be using."));
	} else {
		result.appendChild(document.createTextNode(": "));
		var error_span = create_element("span");
		error_span.className = "result_error";
		error_span.appendChild(document.createTextNode(text));
		result.appendChild(error_span);
		if (type == "handshake_error") {
			result.appendChild(document.createTextNode(" "));
			var ssllabs_link = create_element("a");
			ssllabs_link.href = "https://www.ssllabs.com/ssltest/analyze.html?d=" + encodeURIComponent(host);
			if (ip_address) {
				ssllabs_link.href += "&s=" + encodeURIComponent(ip_address);
			}
			ssllabs_link.href += "&hideResults=on";
			ssllabs_link.appendChild(document.createTextNode("SSL Labs"));
			result.appendChild(ssllabs_link);
			result.appendChild(document.createTextNode(" might be able to tell you what went wrong"));
		}
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

function get_result_type (result)
{
	if (result.trusted) {
		if (result.has_expired_chain) {
			return "trusted_but_expired_chain";
		}
		return "trusted";
	} else if (result.trust_error == "self_signed") {
		return "self_signed";
	} else if (result.trust_error == "expired") {
		return "expired";
	} else {
		return "untrusted";
	}
}

function get_singular_result (results)
{
	for (var i = 1; i < results.length; ++i) {
		if (results[i] != results[i - 1]) {
			return null;
		}
	}
	return results.length ? results[0] : null;
}

function handle_test_results (host, result)
{
	var results = [];
	var has_errors = false;
	for (var i = 0; i < result.length; ++i) {
		if ("trusted" in result[i]) {
			results.push(get_result_type(result[i]));
		} else {
			has_errors = true;
		}
	}
	clear_test_results();
	var singular_result = get_singular_result(results);
	if (!has_errors && singular_result) {
		add_test_result(host, null, singular_result);
	} else {
		for (var i = 0; i < result.length; ++i) {
			if ("trusted" in result[i]) {
				add_test_result(host, result[i].ip_address, get_result_type(result[i]));
			} else {
				add_test_result(host, result[i].ip_address, result[i].error_type + "_error", result[i].error);
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
	do_test(host, form);
	return false;
}

function do_test (host, form)
{
	var uri = whatsmychaincert_endpoint + "/test?host=" + encodeURIComponent(host);
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4) {
			if (host != current_test_host) {
				return;
			}
			current_test_host = null;
			form['host'].disabled = false;
			form['submit_btn'].disabled = false;
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
	add_testing_message(host);
	form['host'].disabled = true;
	form['submit_btn'].disabled = true;
}

function cancel_test ()
{
	var test_form = document.getElementById('test_form');
	test_form['host'].disabled = false;
	test_form['submit_btn'].disabled = false;
	clear_test_results();
	current_test_host = null;
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
		do_test(test_host, test_form);
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
