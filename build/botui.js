/*
 * botui 0.3.9
 * A JS library to build the UI for your bot
 * https://botui.org
 *
 * Copyright 2020, Moin Uddin
 * Released under the MIT license.
*/

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
            template: '<div class=\"botui botui-container\" v-botui-container><div class=\"botui-messages-container\" :key=\"updatevar\"><div v-for=\"msg in messages\" class=\"botui-message\" :class=\"msg.cssClass\" :id=\"\'msgbox\' + msg.index\"><transition name=\"slide-fade\"><div v-if=\"msg.visible\" :style=\"[msg.human ? {}: {\'display\': \'flex\'}]\"><div v-if=\"msg.photo && !msg.loading\" :class=\"[\'profil\', \'profile\', {human: msg.human, \'agent\': !msg.human}]\"> <img :src=\"msg.photo\" :class=\"[{human: msg.human, \'agent\': !msg.human}]\"/></div><div :class=\"[{human: msg.human, incorrect: !msg.is_correct(), clickable: clickable, \'botui-message-content\': true}, msg.type]\" :key=\"msg.updatevar\" v-if=\"!msg.with_checkbox_table && !msg.with_buttons && !msg.is_correct() && clickable\" v-on:click=\"msg.clickcallback\"><span v-if=\"msg.type == \'text\'\" v-text=\"msg.content\" v-botui-markdown></span><span v-if=\"msg.type == \'html\'\" v-html=\"msg.content\"></span> <iframe v-if=\"msg.type == \'embed\'\" :src=\"msg.content\" frameborder=\"0\" allowfullscreen></iframe></div><div :class=\"[{human: msg.human, incorrect: !msg.is_correct(), clickable: clickable, \'botui-message-content\': true}, msg.type]\" :key=\"msg.updatevar\" v-if=\"!msg.with_checkbox_table && !msg.with_buttons && !(!msg.is_correct() && clickable)\"><span v-if=\"msg.type == \'text\'\" v-text=\"msg.content\" v-botui-markdown></span><span v-if=\"msg.type == \'html\'\" v-html=\"msg.content\"></span> <iframe v-if=\"msg.type == \'embed\'\" :src=\"msg.content\" frameborder=\"0\" allowfullscreen></iframe></div><div :class=\"[{human: msg.human, clickable: clickable, \'botui-message-content\': true}, msg.type]\" :key=\"msg.updatevar\" v-if=\"msg.with_buttons\"><span v-if=\"msg.type == \'text\'\" v-text=\"msg.content\" v-botui-markdown></span><span v-if=\"msg.type == \'html\'\" v-html=\"msg.content\"></span> <iframe v-if=\"msg.type == \'embed\'\" :src=\"msg.content\" frameborder=\"0\" allowfullscreen></iframe><div class=\"button-container\"><div v-for=\"button in msg.buttons\"> <button v-text=\"button.name\" v-on:click=\"button.callback\"></button></div></div></div><div :class=\"[{human: msg.human, clickable: clickable, \'botui-message-content\': true}, msg.type]\" :key=\"msg.updatevar\" v-if=\"msg.with_checkbox_table\"><span v-if=\"msg.type == \'text\'\" v-text=\"msg.content\" v-botui-markdown></span><span v-if=\"msg.type == \'html\'\" v-html=\"msg.content\"></span> <iframe v-if=\"msg.type == \'embed\'\" :src=\"msg.content\" frameborder=\"0\" allowfullscreen></iframe><table style=\"font-size: 20px; width: 400px;\"><thead><tr v-for=\"header in msg.headers\"><th :colspan=\"msg.category_num\" style=\"background-color: aliceblue;\"></th><th v-for=\"header_item in header\" :colspan=\"header_item.colspan\" style=\"background-color: aliceblue;\"> {{header_item.name}}</th></tr></thead><tbody><tr v-for=\"row in msg.rows\"><th v-for=\"category in row.category\" :rowspan=\"category.rowspan\" style=\"background-color: aliceblue;\"> {{category.name}}</th><td v-for=\"row_num in row.row_num\"> <input type=\"checkbox\"/></td></tr></tbody></table> <button v-on:click=\"msg.callback\">OK</button></div> <label class=\"switch\"><input class=\"botui-checkbox\" type=\"checkbox\" :checked=\"!msg.is_correct()\" :disabled=\"clickable\" v-on:change=\"msg.toggle\"/><span :class=\"[\'botui-message-button\']\" v-if=\"msg.add_button\" v-text=\"msg.button_msg\"></span></label></div></transition><div v-if=\"msg.photo && msg.loading && !msg.human\" :class=\"[\'profil\', \'profile\', {human: msg.human, \'agent\': !msg.human}]\"> <img :src=\"msg.photo\" :class=\"[{human: msg.human, \'agent\': !msg.human}]\"/></div><div v-if=\"msg.loading\" class=\"botui-message-content loading\"><i class=\"dot\"></i><i class=\"dot\"></i><i class=\"dot\"></i></div></div></div><div class=\"botui-actions-container\"><transition name=\"slide-fade\"><div v-if=\"action.show\" v-botui-scroll><form v-if=\"action.type == \'text\'\" class=\"botui-actions-text\" @submit.prevent=\"handle_action_text()\" :class=\"action.cssClass\"><i v-if=\"action.text.icon\" class=\"botui-icon botui-action-text-icon fa\" :class=\"\'fa-\' + action.text.icon\"></i> <input type=\"text\" ref=\"input\" :type=\"action.text.sub_type\" v-model=\"action.text.value\" class=\"botui-actions-text-input\" :placeholder=\"action.text.placeholder\" :size=\"action.text.size\" :value=\" action.text.value\" :class=\"action.text.cssClass\" required v-focus/> <button type=\"submit\" :class=\"{\'botui-actions-buttons-button\': !!action.text.button, \'botui-actions-text-submit\': !action.text.button}\"><i v-if=\"action.text.button && action.text.button.icon\" class=\"botui-icon botui-action-button-icon fa\" :class=\"\'fa-\' + action.text.button.icon\"></i> <span>{{(action.text.button && action.text.button.label) || \'Go\'}}</span></button></form><form v-if=\"action.type == \'select\'\" class=\"botui-actions-select\" @submit.prevent=\"handle_action_select()\" :class=\"action.cssClass\"><i v-if=\"action.select.icon\" class=\"botui-icon botui-action-select-icon fa\" :class=\"\'fa-\' + action.select.icon\"></i><v-select v-if=\"action.select.searchselect && !action.select.multipleselect\" v-model=\"action.select.value\" :value=\"action.select.value\" :placeholder=\"action.select.placeholder\" class=\"botui-actions-text-searchselect\" :label=\"action.select.label\" :options=\"action.select.options\"></v-select><v-select v-else-if=\"action.select.searchselect && action.select.multipleselect\" multiple v-model=\"action.select.value\" :value=\"action.select.value\" :placeholder=\"action.select.placeholder\" class=\"botui-actions-text-searchselect\" :label=\"action.select.label\" :options=\"action.select.options\"></v-select> <select v-else v-model=\"action.select.value\" class=\"botui-actions-text-select\" :placeholder=\"action.select.placeholder\" :size=\"action.select.size\" :class=\"action.select.cssClass\" required v-focus><option v-for=\"option in action.select.options\" :class=\"action.select.optionClass\" v-bind:value=\"option.value\" :disabled=\"(option.value == \'\')?true:false\" :selected=\"(action.select.value == option.value)?\'selected\':\'\'\"> {{ option.text }}</option></select> <button type=\"submit\" :class=\"{\'botui-actions-buttons-button\': !!action.select.button, \'botui-actions-select-submit\': !action.select.button}\"><i v-if=\"action.select.button && action.select.button.icon\" class=\"botui-icon botui-action-button-icon fa\" :class=\"\'fa-\' + action.select.button.icon\"></i> <span>{{(action.select.button && action.select.button.label) || \'Ok\'}}</span></button></form><div v-if=\"action.type == \'button\'\" class=\"botui-actions-buttons\" :class=\"action.cssClass\"> <button type=\"button\" :class=\"button.cssClass\" class=\"botui-actions-buttons-button\" v-botui-scroll v-for=\"button in action.button.buttons\" @click=\"handle_action_button(button)\"><i v-if=\"button.icon\" class=\"botui-icon botui-action-button-icon fa\" :class=\"\'fa-\' + button.icon\"></i> {{button.text}}</button></div><form v-if=\"action.type == \'buttontext\'\" class=\"botui-actions-text\" @submit.prevent=\"handle_action_text()\" :class=\"action.cssClass\"><i v-if=\"action.text.icon\" class=\"botui-icon botui-action-text-icon fa\" :class=\"\'fa-\' + action.text.icon\"></i> <input type=\"text\" ref=\"input\" :type=\"action.text.sub_type\" v-model=\"action.text.value\" class=\"botui-actions-text-input\" :placeholder=\"action.text.placeholder\" :size=\"action.text.size\" :value=\"action.text.value\" :class=\"action.text.cssClass\" required v-focus/> <button type=\"submit\" :class=\"{\'botui-actions-buttons-button\': !!action.text.button, \'botui-actions-text-submit\': !action.text.button}\"><i v-if=\"action.text.button && action.text.button.icon\" class=\"botui-icon botui-action-button-icon fa\" :class=\"\'fa-\' + action.text.button.icon\"></i> <span>{{(action.text.button && action.text.button.label) || \'Go\'}}</span></button><div class=\"botui-actions-buttons\" :class=\"action.cssClass\"> <button type=\"button\" :class=\"button.cssClass\" class=\"botui-actions-buttons-button\" v-for=\"button in action.button.buttons\" @click=\"handle_action_button(button)\" autofocus><i v-if=\"button.icon\" class=\"botui-icon botui-action-button-icon fa\" :class=\"\'fa-\' + button.icon\"></i> {{button.text}}</button></div></form></div></transition></div></div>', // replaced by HTML template during build. see Gulpfile.js
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
            _msg.buttons.foreach(function(button) {
                button.callback = function() {
                    button.callback(index);
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
                return _addMessageWithButtons(
                    _checkOpts(addOpts),
                    index
                ).then(function(_index) {
                    _updateMsgIndex();
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
            },
            insert_with_checkbox_table: function(index, addOpts) {
                return _addMessageWithCheckboxTable(
                    _checkOpts(addOpts),
                    index
                ).then(function(_index) {
                    _updateMsgIndex();
                    setTimeout(function() {
                        var _msg_ref = document.getElementById('msgbox' + _index);
                        console.log(_index);
                        _msg_ref.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100); // HACK!!
                    return _index;
                });
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
                return _addMessage(_checkOpts(addOpts), index).then(function(
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
            enableIncorrectClick: function(callback) {
                _instance.clickable = true;
                _instance.clickcallback = callback;
                _instance.updatevar += 1;
            },
            disableIncorrectClick: function() {
                _instance.clickable = false;

                _instance.updatevar += 1;
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
                _opts.action.searchselect = typeof _opts.action.searchselect !==
                    'undefined' ?
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