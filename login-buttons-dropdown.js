// for convenience
var loginButtonsSession = Accounts._loginButtonsSession;

//
// Activate semantic ui dropdowns
//
Template._loginButtonsLoggedInDropdown.rendered = function() {
	// activate the dropdown if it is not a "simple" dropdown
	var dropdown = this.$('#login-dropdown');
	maybeActivateSemanticDropdown(dropdown);

}
Template._loginButtonsLoggedOutDropdown.rendered = function() {
	// activate the dropdown if it is not a "simple" dropdown
	var dropdown = this.$('#login-dropdown');
	maybeActivateSemanticDropdown(dropdown);
}
var maybeActivateSemanticDropdown = function(dropdownElement) {
	if (dropdownElement.length > 0) {
		// users can specify extra classes in the {{> loginButtons}} template helper, and hence the dropdown might be "simple" and not need any JS attached at all.
		if (! dropdownElement.hasClass('simple')) {
			dropdownOptions = {
				action: 'nothing', // when user clicks on button/item in dropdown, do not do anything (by default, it will close the dropdown)
				onChange: function() {}
			}
			if (Accounts.ui._options.dropdownTransition) {
				dropdownOptions.transition = Accounts.ui._options.dropdownTransition;
			}
			dropdownElement.dropdown(dropdownOptions);
		}
	}
}

// events shared between loginButtonsLoggedOutDropdown and
// loginButtonsLoggedInDropdown
Template.loginButtons.events({
	'click #login-name-link, click #login-sign-in-link': function (e) {
		e.preventDefault(); // semantic wants to close the dropdown when you change dropdown "views"
		loginButtonsSession.set('dropdownVisible', true);
		Tracker.flush();
		correctDropdownZIndexes();
	},
	'click .login-close-text': function () {
		loginButtonsSession.closeDropdown();
	}
});


//
// loginButtonsLoggedInDropdown template and related
//

Template._loginButtonsLoggedInDropdown.events({
	'click #login-buttons-open-change-password': function(e) {
		e.preventDefault(); // semantic wants to close the dropdown when you change dropdown "views"
		loginButtonsSession.resetMessages();
		loginButtonsSession.set('inChangePasswordFlow', true);
	}
});

Template._loginButtonsLoggedInDropdown.helpers({
	displayName: displayName,

	inChangePasswordFlow: function () {
		return loginButtonsSession.get('inChangePasswordFlow');
	},

	inMessageOnlyFlow: function () {
		return loginButtonsSession.get('inMessageOnlyFlow');
	},

	dropdownVisible: function () {
		return loginButtonsSession.get('dropdownVisible');
	},

	dropdownClasses: function () {
		return Accounts.ui._options.dropdownClasses || '';
	}
});

Template._loginButtonsLoggedInDropdownActions.helpers({
	allowChangingPassword: function () {
		// it would be more correct to check whether the user has a password set,
		// but in order to do that we'd have to send more data down to the client,
		// and it'd be preferable not to send down the entire service.password document.
		//
		// instead we use the heuristic: if the user has a username or email set.
		var user = Meteor.user();
		return user.username || (user.emails && user.emails[0] && user.emails[0].address);
	},

	hasAdditionalDropdownTemplate: function() {
		return Template._loginButtonsAdditionalLoggedInDropdownActions !== undefined;
	},

	loggingOut: function(){
		return loginButtonsSession.get("inLogoutFlow");
	}
});


//
// loginButtonsLoggedOutDropdown template and related
//

Template._loginButtonsLoggedOutDropdown.events({
	'click #login-buttons-password': function () {
		loginOrSignup();
	},

	'keypress #forgot-password-email': function (event) {
		event.stopPropagation();
		if (event.keyCode === 13)
			forgotPassword();
	},

	'click #login-buttons-forgot-password': function (event) {
		event.stopPropagation();
		forgotPassword();
	},

	'click #signup-link': function (event) {
		event.stopPropagation();
		loginButtonsSession.resetMessages();

		// store values of fields before swtiching to the signup form
		var username = trimmedElementValueById('login-username');
		var email = trimmedElementValueById('login-email');
		var usernameOrEmail = trimmedElementValueById('login-username-or-email');
		// notably not trimmed. a password could (?) start or end with a space
		var password = elementValueById('login-password');

		loginButtonsSession.set('inSignupFlow', true);
		loginButtonsSession.set('inForgotPasswordFlow', false);
		// force the ui to update so that we have the approprate fields to fill in
		Tracker.flush();

		// update new fields with appropriate defaults
		if (username !== null)
			document.getElementById('login-username').value = username;
		else if (email !== null)
			document.getElementById('login-email').value = email;
		else if (usernameOrEmail !== null)
			if (usernameOrEmail.indexOf('@') === -1)
				document.getElementById('login-username').value = usernameOrEmail;
			else
				document.getElementById('login-email').value = usernameOrEmail;

		if (password !== null)
			document.getElementById('login-password').value = password;

		// Force redrawing the `login-dropdown-list` element because of
		// a bizarre Chrome bug in which part of the DIV is not redrawn
		// in case you had tried to unsuccessfully log in before
		// switching to the signup form.
		//
		// Found tip on how to force a redraw on
		// http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes/3485654#3485654
		var redraw = document.getElementById('login-dropdown-list');
		redraw.style.display = 'none';
		redraw.offsetHeight; // it seems that this line does nothing but is necessary for the redraw to work
		redraw.style.display = 'block';
	},
	'click #forgot-password-link': function (event) {
		event.stopPropagation();
		loginButtonsSession.resetMessages();

		// store values of fields before swtiching to the signup form
		var email = trimmedElementValueById('login-email');
		var usernameOrEmail = trimmedElementValueById('login-username-or-email');

		loginButtonsSession.set('inSignupFlow', false);
		loginButtonsSession.set('inForgotPasswordFlow', true);
		// force the ui to update so that we have the approprate fields to fill in
		Tracker.flush();

		// update new fields with appropriate defaults
		if (email !== null)
			document.getElementById('forgot-password-email').value = email;
		else if (usernameOrEmail !== null)
			if (usernameOrEmail.indexOf('@') !== -1)
				document.getElementById('forgot-password-email').value = usernameOrEmail;

	},
	'click #back-to-login-link': function (event) {
		event.stopPropagation();
		loginButtonsSession.resetMessages();

		var username = trimmedElementValueById('login-username');
		var email = trimmedElementValueById('login-email') || trimmedElementValueById('forgot-password-email'); // Ughh. Standardize on names?
		// notably not trimmed. a password could (?) start or end with a space
		var password = elementValueById('login-password');

		loginButtonsSession.set('inSignupFlow', false);
		loginButtonsSession.set('inForgotPasswordFlow', false);
		// force the ui to update so that we have the approprate fields to fill in
		Tracker.flush();

		if (document.getElementById('login-username'))
			document.getElementById('login-username').value = username;
		if (document.getElementById('login-email'))
			document.getElementById('login-email').value = email;

		if (document.getElementById('login-username-or-email'))
			document.getElementById('login-username-or-email').value = email || username;

		if (password !== null)
			document.getElementById('login-password').value = password;
	},
	'keypress #login-username, keypress #login-email, keypress #login-username-or-email, keypress #login-password, keypress #login-password-again': function (event) {
		if (event.keyCode === 13)
			loginOrSignup();
	}
});

Template._loginButtonsLoggedOutDropdown.helpers({
	// additional classes that can be helpful in styling the dropdown
	additionalClasses: function () {
		if (!hasPasswordService()) {
			return false;
		} else {
			if (loginButtonsSession.get('inSignupFlow')) {
				return 'login-form-create-account';
			} else if (loginButtonsSession.get('inForgotPasswordFlow')) {
				return 'login-form-forgot-password';
			} else {
				return 'login-form-sign-in';
			}
		}
	},

	dropdownVisible: function () {
		return loginButtonsSession.get('dropdownVisible');
	},

	hasPasswordService: hasPasswordService,

	dropdownClasses: function () {
		return Accounts.ui._options.dropdownClasses || '';
	}
});

// return all login services, with password last
Template._loginButtonsLoggedOutAllServices.helpers({
	services: getLoginServices,

	isPasswordService: function () {
		return this.name === 'password';
	},

	hasOtherServices: function () {
		return getLoginServices().length > 1;
	},

	hasPasswordService: hasPasswordService
});

Template._loginButtonsLoggedOutPasswordService.helpers({
	fields: function () {
		var loginFields = [
			{
				fieldName: 'username-or-email',
				fieldLabel: 'Username or Email',
				visible: function () {
					return _.contains(
						["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL"],
						passwordSignupFields()
					);
				}
			},
			{
				fieldName: 'username',
				fieldLabel: 'Username',
				visible: function () {
					return passwordSignupFields() === "USERNAME_ONLY";
				}
			},
			{
				fieldName: 'email',
				fieldLabel: 'Email',
				inputType: 'email',
				visible: function () {
					return passwordSignupFields() === "EMAIL_ONLY";
				}
			},
			{
				fieldName: 'password',
				fieldLabel: 'Password',
				inputType: 'password',
				visible: function () {
					return true;
				}
			}
		];

		var signupFields = [
			{
				fieldName: 'username',
				fieldLabel: 'Username',
				visible: function () {
					return _.contains(
					["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"],
					passwordSignupFields());
				}
			},
			{
				fieldName: 'email',
				fieldLabel: 'Email',
				inputType: 'email',
				visible: function () {
					return _.contains(
					["USERNAME_AND_EMAIL", "EMAIL_ONLY"],
					passwordSignupFields());
				}
			},
			{
				fieldName: 'email',
				fieldLabel: 'Email (optional)',
				inputType: 'email',
				visible: function () {
					return passwordSignupFields() === "USERNAME_AND_OPTIONAL_EMAIL";
				}
			},
			{
				fieldName: 'password',
				fieldLabel: 'Password',
				inputType: 'password',
				visible: function () {
					return true;
				}
			},
			{
				fieldName: 'password-again',
				fieldLabel: 'Password (again)',
				inputType: 'password',
				visible: function () {
					// No need to make users double-enter their password if
					// they'll necessarily have an email set, since they can use
					// the "forgot password" flow.
					return _.contains(
						["USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"],
						passwordSignupFields()
					);
				}
			}
		];

		signupFields = signupFields.concat(Accounts.ui._options.extraSignupFields);

		return loginButtonsSession.get('inSignupFlow') ? signupFields : loginFields;
	},

	inForgotPasswordFlow: function () {
		return loginButtonsSession.get('inForgotPasswordFlow');
	},

	inLoginFlow: function () {
		return !loginButtonsSession.get('inSignupFlow') && !loginButtonsSession.get('inForgotPasswordFlow');
	},

	inSignupFlow: function () {
		return loginButtonsSession.get('inSignupFlow');
	},

	showCreateAccountLink: function () {
		return !Accounts._options.forbidClientAccountCreation;
	},

	showForgotPasswordLink: function () {
		return _.contains(
			["USERNAME_AND_EMAIL", "USERNAME_AND_OPTIONAL_EMAIL", "EMAIL_ONLY"],
			passwordSignupFields()
		);
	}
});

Template._loginButtonsFormField.helpers({
	inputType: function () {
		return this.inputType || "text";
	},
	equals: function(a, b) {
		return (a === b);
	}
});


//
// loginButtonsChangePassword template
//

Template._loginButtonsChangePassword.events({
	'keypress #login-old-password, keypress #login-password, keypress #login-password-again': function (event) {
		if (event.keyCode === 13)
			changePassword();
	},
	'click #login-buttons-do-change-password': function () {
		changePassword();
	},
	'click #login-buttons-cancel-change-password': function(event) {
		event.stopPropagation();
		loginButtonsSession.resetMessages();
		Accounts._loginButtonsSession.set('inChangePasswordFlow', false);
		Meteor.flush();
	}
});

Template._loginButtonsChangePassword.helpers({
	fields: function () {
		return [
			{
				fieldName: 'old-password',
				fieldLabel: 'Current Password',
				inputType: 'password',
				visible: function () {
					return true;
				}
			},
			{
				fieldName: 'password',
				fieldLabel: 'New Password',
				inputType: 'password',
				visible: function () {
					return true;
				}
			},
			{
				fieldName: 'password-again',
				fieldLabel: 'New Password (again)',
				inputType: 'password',
				visible: function () {
					// No need to make users double-enter their password if
					// they'll necessarily have an email set, since they can use
					// the "forgot password" flow.
					return _.contains( ["USERNAME_AND_OPTIONAL_EMAIL", "USERNAME_ONLY"], passwordSignupFields());
				}
			}
		];
	}
});


//
// helpers
//

var elementValueById = function(id) {
	var element = document.getElementById(id);
	if (!element)
		return null;
	else
		return element.value;
};

var trimmedElementValueById = function(id) {
	var element = document.getElementById(id);
	if (!element)
		return null;
	else
		return element.value.replace(/^\s*|\s*$/g, ""); // trim() doesn't work on IE8;
};

var loginOrSignup = function () {
	if (loginButtonsSession.get('inSignupFlow'))
		signup();
	else
		login();
};

var login = function () {
	loginButtonsSession.resetMessages();

	var username = trimmedElementValueById('login-username');
	var email = trimmedElementValueById('login-email');
	var usernameOrEmail = trimmedElementValueById('login-username-or-email');
	// notably not trimmed. a password could (?) start or end with a space
	var password = elementValueById('login-password');

	var loginSelector;
	if (username !== null) {
		if (!validateUsername(username))
			return;
		else
			loginSelector = {username: username};
	} else if (email !== null) {
		if (!validateEmail(email))
			return;
		else
			loginSelector = {email: email};
	} else if (usernameOrEmail !== null) {
		// XXX not sure how we should validate this. but this seems good enough (for now),
		// since an email must have at least 3 characters anyways
		if (!validateUsername(usernameOrEmail))
			return;
		else
			loginSelector = usernameOrEmail;
		} else {
			throw new Error("Unexpected -- no element to use as a login user selector");
		}

		Meteor.loginWithPassword(loginSelector, password, function (error, result) {
			if (error) {
				loginButtonsSession.errorMessage(error.reason || "Unknown error");
			} else {
				loginButtonsSession.closeDropdown();
			}
		});
};

var signup = function () {
	loginButtonsSession.resetMessages();

	var options = {}; // to be passed to Accounts.createUser

	var username = trimmedElementValueById('login-username');
	if (username !== null) {
		if (!validateUsername(username))
			return;
		else
			options.username = username;
	}

	var email = trimmedElementValueById('login-email');
	if (email !== null) {
		if (!validateEmail(email))
			return;
		else
			options.email = email;
	}

	// notably not trimmed. a password could (?) start or end with a space
	var password = elementValueById('login-password');
	if (!validatePassword(password))
		return;
	else
		options.password = password;

	if (!matchPasswordAgainIfPresent())
		return;

	//
	// Parsing and storing extra signup fields. Code from ian:accounts-ui-bootstrap-3
	//

	// prepare the profile object if needed
	if (! (options.profile instanceof Object)) {
		options.profile = {};
	}

	// define a proxy function to allow extraSignupFields to set error messages
	var errorFunction = function(errorMessage) {
		Accounts._loginButtonsSession.errorMessage(errorMessage);
	}

	var invalidExtraSignupFields = false;

	// parse and populate fields
	_.each(Accounts.ui._options.extraSignupFields, function(field, index) {
		var value = elementValueById('login-' + field.fieldName);
		if (typeof field.validate == 'function') {
			if (field.validate(value, errorFunction)) {
				if (typeof field.saveToProfile !== 'undefined' && ! field.saveToProfile) {
					options[field.fieldName] = value;
				} else {
					options.profile[field.fieldName] = value;
				}
			} else {
				invalidExtraSignupFields = true;
			}
		} else {
			options.profile[field.fieldName] = value;
		}
	});

	if (invalidExtraSignupFields) {
		return;
	}

	Accounts.createUser(options, function (error) {
		if (error) {
			loginButtonsSession.errorMessage(error.reason || "Unknown error");
		} else {
			loginButtonsSession.closeDropdown();
		}
	});
};

var forgotPassword = function () {
	loginButtonsSession.resetMessages();

	var email = trimmedElementValueById("forgot-password-email");
	if (email.indexOf('@') !== -1) {
		Accounts.forgotPassword({email: email}, function (error) {
			if (error)
				loginButtonsSession.errorMessage(error.reason || "Unknown error");
			else
				loginButtonsSession.infoMessage("Email sent");
		});
	} else {
		loginButtonsSession.errorMessage("Invalid email");
	}
};

var changePassword = function () {
	loginButtonsSession.resetMessages();

	// notably not trimmed. a password could (?) start or end with a space
	var oldPassword = elementValueById('login-old-password');

	// notably not trimmed. a password could (?) start or end with a space
	var password = elementValueById('login-password');
	if (!validatePassword(password))
		return;

	if (!matchPasswordAgainIfPresent())
		return;

	Accounts.changePassword(oldPassword, password, function (error) {
		if (error) {
			loginButtonsSession.errorMessage(error.reason || "Unknown error");
		} else {
			loginButtonsSession.set('inChangePasswordFlow', false);
			// inMessageOnlyFlow is what is messing things up -- removing it doesn't result in the most elegant solution, but it works for now
//			loginButtonsSession.set('inMessageOnlyFlow', true);
			loginButtonsSession.infoMessage("Password changed");

			// wait 3 seconds, then expire the msg  **adding from bootstrap version
			Meteor.setTimeout(function() {
				loginButtonsSession.resetMessages();
			}, 3000);
		}
	});
};

var matchPasswordAgainIfPresent = function () {
	// notably not trimmed. a password could (?) start or end with a space
	var passwordAgain = elementValueById('login-password-again');
	if (passwordAgain !== null) {
		// notably not trimmed. a password could (?) start or end with a space
		var password = elementValueById('login-password');
		if (password !== passwordAgain) {
			loginButtonsSession.errorMessage("Passwords don't match");
			return false;
		}
	}
	return true;
};

var correctDropdownZIndexes = function () {
	// IE <= 7 has a z-index bug that means we can't just give the
	// dropdown a z-index and expect it to stack above the rest of
	// the page even if nothing else has a z-index.  The nature of
	// the bug is that all positioned elements are considered to
	// have z-index:0 (not auto) and therefore start new stacking
	// contexts, with ties broken by page order.
	//
	// The fix, then is to give z-index:1 to all ancestors
	// of the dropdown having z-index:0.
	for(var n = document.getElementById('login-dropdown-list').parentNode; n.nodeName !== 'BODY'; n = n.parentNode)
			if (n.style.zIndex === 0)
				n.style.zIndex = 1;
};
