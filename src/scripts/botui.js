(function(root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return (root.BotUI = factory(root));
        });
    } else {
        root.BotUI = factory(root);
    }
})(typeof window !== 'undefined' ? window : this, function(root, undefined) {
    'use strict';
    var BotUI = function(id, opts) {
        opts = opts || {};

        if (!id) {
            throw Error('BotUI: Container id is required as first argument.');
        }

        if (!document.getElementById(id)) {
            throw Error('BotUI: Element with id #' + id + ' does not exist.');
        }

        if (!root.Vue && !opts.vue) {
            throw Error('BotUI: Vue is required but not found.');
        }

        var _botApp, // current vue instance.
            _options = {
                debug: false,
                fontawesome: true,
                searchselect: true,
            },
            _container, // the outermost Element. Needed to scroll to bottom, for now.
            _interface = {}, // methods returned by a BotUI() instance.
            _actionResolve,
            _markDownRegex = {
                icon: /!\(([^\)]+)\)/gim, // !(icon)
                image: /!\[(.*?)\]\((.*?)\)/gim, // ![aleternate text](src)
                link: /\[([^\[]+)\]\(([^\)]+)\)(\^?)/gim, // [text](link) ^ can be added at end to set the target as 'blank'
            },
            _fontAwesome = 'https://use.fontawesome.com/ea731dcb6f.js',
            _esPromisePollyfill =
            'https://cdn.jsdelivr.net/es6-promise/4.1.0/es6-promise.min.js', // mostly for IE
            _searchselect = 'https://unpkg.com/vue-select@2.4.0/dist/vue-select.js';

        root.Vue = root.Vue || opts.vue;

        // merge opts passed to constructor with _options
        for (var prop in _options) {
            if (opts.hasOwnProperty(prop)) {
                _options[prop] = opts[prop];
            }
        }

        if (!root.Promise && typeof Promise === 'undefined' && !opts.promise) {
            loadScript(_esPromisePollyfill);
        }

        function _linkReplacer(match, $1, $2, $3) {
            var _target = $3 ? 'blank' : ''; // check if '^' sign is present with link syntax
            return (
                "<a class='botui-message-content-link' target='" +
                _target +
                "' href='" +
                $2 +
                "'>" +
                $1 +
                '</a>'
            );
        }

        function _parseMarkDown(text) {
            return text
                .replace(
                    _markDownRegex.image,
                    "<img class='botui-message-content-image' src='$2' alt='$1' />"
                )
                .replace(
                    _markDownRegex.icon,
                    "<i class='botui-icon botui-message-content-icon fa fa-$1'></i>"
                )
                .replace(_markDownRegex.link, _linkReplacer);
        }

        function loadScript(src, cb) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = src;

            if (cb) {
                script.onload = cb;
            }

            document.body.appendChild(script);
        }

        function _handleAction(text) {
            if (_instance.action.addMessage) {
                _interface.message.human({
                    delay: 100,
                    content: text,
                });
            }
            _instance.action.show = !_instance.action.autoHide;
        }

        var _botuiComponent = {
            template: 'BOTUI_TEMPLATE', // replaced by HTML template during build. see Gulpfile.js
            data: function() {
                return {
                    action: {
                        text: {
                            size: 30,
                            placeholder: 'Write here ..',
                        },
                        button: {},
                        show: false,
                        type: 'text',
                        autoHide: true,
                        addMessage: true,
                    },
                    messages: [],
                    updatevar: 0,
                    clickable: false,
                    clickcallback: null,
                };
            },
            computed: {
                isMobile: function() {
                    return root.innerWidth && root.innerWidth <= 768;
                },
            },
            methods: {
                handle_action_button: function(button) {
                    for (var i = 0; i < this.action.button.buttons.length; i++) {
                        if (
                            this.action.button.buttons[i].value == button.value &&
                            typeof this.action.button.buttons[i].event == 'function'
                        ) {
                            this.action.button.buttons[i].event(button);
                            if (this.action.button.buttons[i].actionStop) return false;
                            break;
                        }
                    }

                    _handleAction(button.text);

                    var defaultActionObj = {
                        type: 'button',
                        text: button.text,
                        value: button.value,
                    };

                    for (var eachProperty in button) {
                        if (button.hasOwnProperty(eachProperty)) {
                            if (
                                eachProperty !== 'type' &&
                                eachProperty !== 'text' &&
                                eachProperty !== 'value'
                            ) {
                                defaultActionObj[eachProperty] = button[eachProperty];
                            }
                        }
                    }

                    _actionResolve(defaultActionObj);
                },
                handle_action_text: function() {
                    if (!this.action.text.value) return;
                    _handleAction(this.action.text.value);
                    _actionResolve({
                        type: 'text',
                        value: this.action.text.value,
                    });
                    this.action.text.value = '';
                },
                handle_action_select: function() {
                    if (
                        this.action.select.searchselect &&
                        !this.action.select.multipleselect
                    ) {
                        if (!this.action.select.value.value) return;
                        _handleAction(this.action.select.value[this.action.select.label]);
                        _actionResolve({
                            type: 'text',
                            value: this.action.select.value.value,
                            text: this.action.select.value.text,
                            obj: this.action.select.value,
                        });
                    }
                    if (
                        this.action.select.searchselect &&
                        this.action.select.multipleselect
                    ) {
                        if (!this.action.select.value) return;
                        var values = new Array();
                        var labels = new Array();
                        for (var i = 0; i < this.action.select.value.length; i++) {
                            values.push(this.action.select.value[i].value);
                            labels.push(
                                this.action.select.value[i][this.action.select.label]
                            );
                        }
                        _handleAction(labels.join(', '));
                        _actionResolve({
                            type: 'text',
                            value: values.join(', '),
                            text: labels.join(', '),
                            obj: this.action.select.value,
                        });
                    } else {
                        if (!this.action.select.value) return;
                        for (var i = 0; i < this.action.select.options.length; i++) {
                            // Find select title
                            if (
                                this.action.select.options[i].value == this.action.select.value
                            ) {
                                _handleAction(this.action.select.options[i].text);
                                _actionResolve({
                                    type: 'text',
                                    value: this.action.select.value,
                                    text: this.action.select.options[i].text,
                                });
                            }
                        }
                    }
                },
            },
        };

        root.Vue.directive('botui-markdown', function(el, binding) {
            if (binding.value == 'false') return; // v-botui-markdown="false"
            el.innerHTML = _parseMarkDown(el.textContent);
        });

        root.Vue.directive('botui-scroll', {
            inserted: function(el) {
                _container.scrollTop = _container.scrollHeight;
                el.scrollIntoView(true);
            },
        });

        root.Vue.directive('focus', {
            inserted: function(el) {
                el.focus();
            },
        });

        root.Vue.directive('botui-container', {
            inserted: function(el) {
                _container = el;
            },
        });

        _botApp = new root.Vue({
            components: {
                'bot-ui': _botuiComponent,
            },
        }).$mount('#' + id);

        var _instance = _botApp.$children[0]; // to access the component's data

        function _messageSetup(_msg, index) {
            if (!_msg.loading && !_msg.content) {
                throw Error(
                    'BotUI: "content" is required in a non-loading message object.'
                );
            }
            _msg.checkboxes = [];
            _msg.updatevar = 0;
            _msg.correct_ref_idx = _msg.correct_ref_idx || 0;
            _msg.type = _msg.type || 'text';
            _msg.button_msg = 'Correct';
            _msg.correct_ref_msg = _msg;
            _msg.nlq_ref_idx = _msg.nlq_ref_idx || -1;
            if (_msg.correct_ref_idx != 0) {
                var added_index = index;
                if (index == -1) {
                    added_index = _instance.messages.length;
                }
                _msg.correct_ref_msg =
                    _instance.messages[added_index + _msg.correct_ref_idx];
            }
            _msg.is_correct = function() {
                if (_msg.correct_ref_msg.button_msg === 'Correct') {
                    return true;
                }
                return false;
            };
            _msg.toggle = function() {
                if (_instance.clickable) {
                    return;
                }
                if (_msg.button_msg === 'Correct') {
                    _msg.button_msg = 'Incorrect';
                } else {
                    _msg.button_msg = 'Correct';
                }
                _msg.updatevar += 1;
                if (_msg.toggle_callback) {
                    _msg.toggle_callback(
                        _interface.message.getMessageLengthCorrectPair()
                    );
                }
            };
            _msg.clickcallback = function() {
                var _before_msg = _instance.messages[_msg.index + _msg.nlq_ref_idx];
                _instance.clickcallback(
                    _msg.index + 1,
                    _msg.content,
                    _before_msg.content
                );
            };
            _msg.visible = _msg.delay || _msg.loading ? false : true;
            var _index = index;
            if (index == -1) {
                _index = _instance.messages.push(_msg) - 1;
            } else {
                _instance.messages.splice(index, 0, _msg);
            }
            _msg.index = _index;
            return _index;
        }

        function _addMessage(_msg, index) {
            const _index = _messageSetup(_msg, index);

            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (_msg.delay) {
                        _msg.visible = true;

                        if (_msg.loading) {
                            _msg.loading = false;
                        }
                    }
                    resolve(_index);
                }, _msg.delay || 0);
            });
        }

        function _addMessageWithButtons(_msg, index) {
            const _index = _messageSetup(_msg, index);
            _msg.with_buttons = true;
            _msg.buttons.forEach(function(button) {
                button.onclick = function() {
                    button.callback(_index);
                };
            });

            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (_msg.delay) {
                        _msg.visible = true;

                        if (_msg.loading) {
                            _msg.loading = false;
                        }
                    }
                    resolve(_index);
                }, _msg.delay || 0);
            });
        }

        function _addMessageWithCheckboxTable(_msg, index) {
            const _index = _messageSetup(_msg, index);
            _msg.with_checkbox_table = true;

            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    if (_msg.delay) {
                        _msg.visible = true;

                        if (_msg.loading) {
                            _msg.loading = false;
                        }
                    }
                    resolve(_index);
                }, _msg.delay || 0);
            });
        }

        function _updateMsgIndex() {
            for (var i = 0; i < _instance.messages.length; i++) {
                var _msg = _instance.messages[i];
                _msg.index = i;
            }
            _instance.updatevar += 1;
        }

        function _checkOpts(_opts) {
            if (typeof _opts === 'string') {
                _opts = {
                    content: _opts,
                };
            }
            return _opts || {};
        }

        _interface.message = {
            add: function(addOpts) {
                return _addMessage(_checkOpts(addOpts), -1).then(function(_index) {
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            bot: function(addOpts) {
                addOpts = _checkOpts(addOpts);
                return _addMessage(addOpts, -1).then(function(_index) {
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            insert_with_button: function(index, addOpts) {
                return _addMessageWithButtons(_checkOpts(addOpts), index).then(function(
                    _index
                ) {
                    _updateMsgIndex();
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            insert_with_checkbox_table: function(index, addOpts) {
                return _addMessageWithCheckboxTable(_checkOpts(addOpts), index).then(
                    function(_index) {
                        _updateMsgIndex();
                        setTimeout(function() {
                            var _msg_ref = document.getElementById('msgbox' + _index);
                            console.log(_index);
                            _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }, 100); // HACK!!
                        return _index;
                    }
                );
            },

            human: function(addOpts) {
                addOpts = _checkOpts(addOpts);
                addOpts.human = true;
                return _addMessage(addOpts, -1).then(function(_index) {
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            get: function(index) {
                return Promise.resolve(_instance.messages[index]);
            },
            remove: function(index) {
                _instance.messages.splice(index, 1);
                return Promise.resolve();
            },
            update: function(index, msg) {
                // only content can be updated, not the message type.
                var _msg = _instance.messages[index];
                _msg.content = msg.content;
                _msg.visible = !msg.loading;
                _msg.loading = !!msg.loading;
                return Promise.resolve(msg.content);
            },
            removeAll: function() {
                _instance.messages.splice(0, _instance.messages.length);
                return Promise.resolve();
            },
            getMessageLengthCorrectPair: function() {
                return new Promise(function(resolve, reject) {
                    var pair_list = [];
                    for (var i = 0; i < _instance.messages.length; i++) {
                        var msgbox_ref = document.getElementById('msgbox' + i);
                        var _msg = _instance.messages[i];
                        pair_list.push([msgbox_ref.offsetHeight + 10, _msg.button_msg]); //hard-coded.. 10 is margin of .botui-message
                    }
                    resolve(pair_list);
                });
            },
            insert: function(index, addOpts) {
                return _addMessage(_checkOpts(addOpts), index).then(function(_index) {
                    _updateMsgIndex();
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            enableIncorrectClick: function(callback) {
                _instance.clickable = true;
                _instance.clickcallback = callback;
                _instance.updatevar += 1;
            },
            disableIncorrectClick: function() {
                _instance.clickable = false;

                _instance.updatevar += 1;
            },
            updateMsgs: function() {
                _instance.messages.forEach(function(_msg) {
                    _msg.updatevar += 1;
                });
            },
        };

        function mergeAtoB(objA, objB) {
            for (var prop in objA) {
                if (!objB.hasOwnProperty(prop)) {
                    objB[prop] = objA[prop];
                }
            }
        }

        function _checkAction(_opts) {
            if (!_opts.action && !_opts.actionButton && !_opts.actionText) {
                throw Error('BotUI: "action" property is required.');
            }
        }

        function _showActions(_opts) {
            _checkAction(_opts);

            mergeAtoB({
                    type: 'text',
                    cssClass: '',
                    autoHide: true,
                    addMessage: true,
                },
                _opts
            );

            _instance.action.type = _opts.type;
            _instance.action.cssClass = _opts.cssClass;
            _instance.action.autoHide = _opts.autoHide;
            _instance.action.addMessage = _opts.addMessage;

            return new Promise(function(resolve, reject) {
                _actionResolve = resolve; // resolved when action is performed, i.e: button clicked, text submitted, etc.
                setTimeout(function() {
                    _instance.action.show = true;
                }, _opts.delay || 0);
            });
        }

        _interface.action = {
            show: _showActions,
            hide: function() {
                _instance.action.show = false;
                return Promise.resolve();
            },
            text: function(_opts) {
                _checkAction(_opts);
                _instance.action.text = _opts.action;
                return _showActions(_opts);
            },
            button: function(_opts) {
                _checkAction(_opts);
                _opts.type = 'button';
                _instance.action.button.buttons = _opts.action;
                return _showActions(_opts);
            },
            select: function(_opts) {
                _checkAction(_opts);
                _opts.type = 'select';
                _opts.action.label = _opts.action.label || 'text';
                _opts.action.value = _opts.action.value || '';
                _opts.action.searchselect =
                    typeof _opts.action.searchselect !== 'undefined' ?
                    _opts.action.searchselect :
                    _options.searchselect;
                _opts.action.multipleselect = _opts.action.multipleselect || false;
                if (
                    _opts.action.searchselect &&
                    typeof _opts.action.value == 'string'
                ) {
                    if (!_opts.action.multipleselect) {
                        for (var i = 0; i < _opts.action.options.length; i++) {
                            // Find object
                            if (_opts.action.options[i].value == _opts.action.value) {
                                _opts.action.value = _opts.action.options[i];
                            }
                        }
                    } else {
                        var vals = _opts.action.value.split(',');
                        _opts.action.value = new Array();
                        for (var i = 0; i < _opts.action.options.length; i++) {
                            // Find object
                            for (var j = 0; j < vals.length; j++) {
                                // Search values
                                if (_opts.action.options[i].value == vals[j]) {
                                    _opts.action.value.push(_opts.action.options[i]);
                                }
                            }
                        }
                    }
                }
                if (!_opts.action.searchselect) {
                    _opts.action.options.unshift({
                        value: '',
                        text: _opts.action.placeholder,
                    });
                }
                _instance.action.button = _opts.action.button;
                _instance.action.select = _opts.action;
                return _showActions(_opts);
            },
            buttontext: function(_opts) {
                _checkAction(_opts);
                _opts.type = 'buttontext';
                _instance.action.button.buttons = _opts.actionButton;
                _instance.action.text = _opts.actionText;
                return _showActions(_opts);
            },
        };

        if (_options.fontawesome) {
            loadScript(_fontAwesome);
        }

        if (_options.searchselect) {
            loadScript(_searchselect, function() {
                Vue.component('v-select', VueSelect.VueSelect);
            });
        }

        if (_options.debug) {
            _interface._botApp = _botApp; // current Vue instance
        }

        return _interface;
    };

    return BotUI;
});