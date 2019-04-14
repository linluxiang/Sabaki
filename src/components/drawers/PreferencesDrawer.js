const fs = require('fs')
const {shell, remote} = require('electron')
const {h, Component} = require('preact')
const classNames = require('classnames')

const Drawer = require('./Drawer')

const t = require('../../i18n').context('PreferencesDrawer')
const dialog = require('../../modules/dialog')
const helper = require('../../modules/helper')
const setting = remote.require('./setting')
const gtplogger = require('../../modules/gtplogger')

class PreferencesItem extends Component {
    constructor(props) {
        super(props)

        this.state = {
            checked: setting.get(props.id)
        }

        this.handleChange = evt => {
            let {onChange = helper.noop} = this.props
            let {checked} = evt.currentTarget

            setting.set(this.props.id, checked)
            onChange(Object.assign({checked}, this.props))
        }

        setting.events.on('change', ({key}) => {
            if (key === this.props.id) {
                this.setState({checked: setting.get(key)})
            }
        })
    }

    shouldComponentUpdate(_, {checked}) {
        return checked !== this.state.checked
    }

    render({text}, {checked}) {
        return h('li', {class: 'preferences-item'},
            h('label', {},
                h('input', {
                    type: 'checkbox',
                    checked,
                    onChange: this.handleChange
                }), ' ',

                text
            )
        )
    }
}

class GeneralTab extends Component {
    constructor() {
        super()

        this.handleSoundEnabledChange = evt => {
            sabaki.window.webContents.setAudioMuted(!evt.checked)
        }

        this.handleTreeStyleChange = evt => {
            let data = {compact: [16, 4], spacious: [22, 4], big: [26, 6]}
            let [graphGridSize, graphNodeSize] = data[evt.currentTarget.value]

            setting.set('graph.grid_size', graphGridSize)
            setting.set('graph.node_size', graphNodeSize)
        }
    }

    render({graphGridSize}) {
        return h('div', {class: 'general'},
            h('ul', {},
                h(PreferencesItem, {
                    id: 'app.enable_hardware_acceleration',
                    text: t('Enable hardware acceleration if possible')
                }),
                h(PreferencesItem, {
                    id: 'app.startup_check_updates',
                    text: t('Check for updates at startup')
                }),
                h(PreferencesItem, {
                    id: 'sound.enable',
                    text: t('Enable sounds'),
                    onChange: this.handleSoundEnabledChange
                }),
                h(PreferencesItem, {
                    id: 'game.goto_end_after_loading',
                    text: t('Jump to end after loading file')
                }),
                h(PreferencesItem, {
                    id: 'view.fuzzy_stone_placement',
                    text: t('Fuzzy stone placement')
                }),
                h(PreferencesItem, {
                    id: 'view.animated_stone_placement',
                    text: t('Animate fuzzy placement')
                }),
                h(PreferencesItem, {
                    id: 'board.variation_instant_replay',
                    text: t('Instantly play out analysis variations on board')
                }),
                h(PreferencesItem, {
                    id: 'gtp.start_game_after_attach',
                    text: t('Start game right after attaching engines')
                }),
                h(PreferencesItem, {
                    id: 'gtp.auto_genmove',
                    text: t('Automatically generate engine moves')
                })
            ),

            h('ul', {},
                h(PreferencesItem, {
                    id: 'comments.show_move_interpretation',
                    text: t('Show automatic move titles')
                }),
                h(PreferencesItem, {
                    id: 'game.show_ko_warning',
                    text: t('Show ko warning')
                }),
                h(PreferencesItem, {
                    id: 'game.show_suicide_warning',
                    text: t('Show suicide warning')
                }),
                h(PreferencesItem, {
                    id: 'edit.show_removenode_warning',
                    text: t('Show remove node warning')
                }),
                h(PreferencesItem, {
                    id: 'edit.show_removeothervariations_warning',
                    text: t('Show remove other variations warning')
                }),
                h(PreferencesItem, {
                    id: 'file.show_reload_warning',
                    text: t('Offer to reload file if changed externally')
                }),
                h(PreferencesItem, {
                    id: 'edit.click_currentvertex_to_remove',
                    text: t('Click last played stone to remove')
                }),
                h(PreferencesItem, {
                    id: 'app.always_show_result',
                    text: t('Always show game result')
                })
            ),

            h('p', {}, h('label', {},
                t('Game Tree Style:'), ' ',

                h('select', {onChange: this.handleTreeStyleChange},
                    h('option', {
                        value: 'compact',
                        selected: graphGridSize < 22
                    }, t('Compact')),

                    h('option', {
                        value: 'spacious',
                        selected: graphGridSize === 22
                    }, t('Spacious')),

                    h('option', {
                        value: 'big',
                        selected: graphGridSize > 22
                    }, t('Big'))
                )
            ))
        )
    }
}

class PathInputItem extends Component {
    constructor(props) {
        super(props)

        this.state = {
            value: setting.get(props.id)
        }

        this.handlePathChange = evt => {
            let value = evt.currentTarget.value.trim() === '' ? null : evt.currentTarget.value

            setting.set(this.props.id, value)
        }

        this.handleBrowseButtonClick = evt => {
            let dialogProperties = this.props.chooseDirectory != null
                ? ['openDirectory', 'createDirectory']
                : ['openFile']

            dialog.showOpenDialog({
                properties: dialogProperties,
            }, ({result}) => {
                if (!result || result.length === 0) return

                this.handlePathChange({currentTarget: {value: result[0]}})
            })
        }

        setting.events.on('change', ({key}) => {
            if (key === this.props.id) {
                this.setState({value: setting.get(key)})
            }
        })
    }

    shouldComponentUpdate({text}, {value}) {
        return this.props.text !== text
            || this.props.value !== value
    }

    render({text}, {value}) {
        return h('li', {class: 'path-input-item'}, h('label', {},
            text != null && h('span', {}, text),

            h('input', {
                type: 'search',
                placeholder: t('Path'),
                value,
                onChange: this.handlePathChange
            }),

            h('a',
                {
                    class: 'browse',
                    onClick: this.handleBrowseButtonClick
                },
                h('img', {
                    src: './node_modules/octicons/build/svg/file-directory.svg',
                    title: t('Browse…'),
                    height: 14
                })
            ),

            value && !(
                this.props.chooseDirectory
                ? helper.isWritableDirectory(value)
                : fs.existsSync(value)
            ) && h('a', {class: 'invalid'},
                h('img', {
                    src: './node_modules/octicons/build/svg/alert.svg',
                    title: this.props.chooseDirectory
                        ? t('Directory not found')
                        : t('File not found'),
                    height: 14
                })
            )
        ))
    }
}

class ThemesTab extends Component {
    constructor() {
        super()

        this.state = {
            currentTheme: setting.get('theme.current')
        }

        this.handleThemeChange = evt => {
            let value = evt.currentTarget.value === '' ? null : evt.currentTarget.value

            setting.set('theme.current', value)
        }

        this.handleLinkClick = evt => {
            evt.preventDefault()

            shell.openExternal(evt.currentTarget.href)
        }

        this.handleUninstallButton = evt => {
            evt.preventDefault()

            let result = dialog.showMessageBox(
                t('Do you really want to uninstall this theme?'),
                'warning', [t('Uninstall'), t('Cancel')], 1
            )

            if (result === 1) return

            let rimraf = require('rimraf')
            let {path} = setting.getThemes()[this.state.currentTheme]

            rimraf(path, err => {
                if (err) return dialog.showMessageBox(t('Uninstallation failed.'), 'error')

                setting.loadThemes()
                setting.set('theme.current', null)
            })
        }

        this.handleInstallButton = evt => {
            evt.preventDefault()

            dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{name: t('Sabaki Themes'), extensions: ['asar']}]
            }, ({result}) => {
                if (!result || result.length === 0) return

                let {join} = require('path')
                let copy = require('recursive-copy')
                let uuid = require('uuid/v1')
                let id = uuid()

                copy(result[0], join(setting.themesDirectory, id), err => {
                    if (err) return dialog.showMessageBox(t('Installation failed.'), 'error')

                    setting.loadThemes()
                    setting.set('theme.current', id)
                })
            })
        }

        setting.events.on('change', ({key}) => {
            if (key === 'theme.current') {
                this.setState({currentTheme: setting.get(key)})
            }
        })
    }

    render() {
        let currentTheme = setting.getThemes()[this.state.currentTheme]

        return h('div', {class: 'themes'},
            h('h3', {}, t('Custom Images')),

            h('ul', {class: 'userpaths'},
                h(PathInputItem, {
                    id: 'theme.custom_blackstones',
                    text: t('Black stone image:')
                }),
                h(PathInputItem, {
                    id: 'theme.custom_whitestones',
                    text: t('White stone image:')
                }),
                h(PathInputItem, {
                    id: 'theme.custom_board',
                    text: t('Board image:')
                }),
                h(PathInputItem, {
                    id: 'theme.custom_background',
                    text: t('Background image:')
                })
            ),

            h('h3', {}, 'Current Theme'),

            h('p', {},
                h('select',
                    {onChange: this.handleThemeChange},

                    h('option', {value: '', selected: currentTheme == null}, t('Default')),

                    Object.keys(setting.getThemes()).map(id => h('option',
                        {
                            value: id,
                            selected: currentTheme && currentTheme.id === id
                        },

                        setting.getThemes()[id].name
                    ))
                ), ' ',

                currentTheme && h('button', {
                    type: 'button',
                    onClick: this.handleUninstallButton
                }, t('Uninstall')),

                h('div', {class: 'install'},
                    h('button', {
                        type: 'button',
                        onClick: this.handleInstallButton
                    }, t('Install Theme…')),
                    ' ',
                    h('a', {
                        href: `https://github.com/SabakiHQ/Sabaki/blob/v${sabaki.version}/docs/guides/theme-directory.md`,
                        onClick: this.handleLinkClick
                    }, t('Get more themes…'))
                )
            ),

            currentTheme && [
                h('p', {class: 'meta'},
                    currentTheme.author && t(p => `by ${p.author}`, {
                        author: currentTheme.author
                    }),
                    currentTheme.author && currentTheme.homepage && ' — ',
                    currentTheme.homepage && h('a', {
                        class: 'homepage',
                        href: currentTheme.homepage,
                        title: currentTheme.homepage,
                        onClick: this.handleLinkClick
                    }, t('Homepage'))
                ),

                h('p', {class: 'description'},
                    currentTheme.version && h('span', {class: 'version'},
                        'v' + currentTheme.version
                    ), ' ',

                    currentTheme.description
                )
            ]
        )
    }
}

class EngineItem extends Component {
    constructor() {
        super()

        this.handleChange = evt => {
            let {onChange = helper.noop} = this.props
            let element = evt.currentTarget
            let data = Object.assign({}, this.props, {
                [element.name]: element.value
            })

            onChange(data)
        }

        this.handleBrowseButtonClick = () => {
            dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{name: t('All Files'), extensions: ['*']}]
            }, ({result}) => {
                if (!result || result.length === 0) return

                let {id, name, args, onChange = helper.noop} = this.props
                onChange({id, name, args, path: result[0]})
            })
        }

        this.handleRemoveButtonClick = () => {
            let {onRemove = helper.noop} = this.props
            onRemove(this.props)
        }
    }

    shouldComponentUpdate({name, path, args, commands}) {
        return name !== this.props.name
            || path !== this.props.path
            || args !== this.props.args
            || commands !== this.props.commands
    }

    render({name, path, args, commands}) {
        return h('li', {},
            h('h3', {},
                h('a',
                    {
                        class: 'remove',
                        title: t('Remove'),
                        onClick: this.handleRemoveButtonClick
                    },

                    h('img', {src: './node_modules/octicons/build/svg/x.svg'})
                ),
                h('input', {
                    type: 'text',
                    placeholder: t('(Unnamed Engine)'),
                    value: name,
                    name: 'name',
                    onChange: this.handleChange
                })
            ),
            h('p', {},
                h('a',
                    {
                        class: 'browse',
                        title: t('Browse…'),
                        onClick: this.handleBrowseButtonClick
                    },

                    h('img', {src: './node_modules/octicons/build/svg/file-directory.svg'})
                ),
                h('input', {
                    type: 'text',
                    placeholder: t('Path'),
                    value: path,
                    name: 'path',
                    onChange: this.handleChange
                })
            ),
            h('p', {},
                h('input', {
                    type: 'text',
                    placeholder: t('No arguments'),
                    value: args,
                    name: 'args',
                    onChange: this.handleChange
                })
            ),
            h('p', {},
                h('input', {
                    type: 'text',
                    placeholder: t('Initial commands (;-separated)'),
                    value: commands,
                    name: 'commands',
                    onChange: this.handleChange
                })
            )
        )
    }
}

class EnginesTab extends Component {
    constructor() {
        super()

        this.handleItemChange = ({id, name, path, args, commands}) => {
            let engines = this.props.engines.slice()

            engines[id] = {name, path, args, commands}
            setting.set('engines.list', engines)
        }

        this.handleItemRemove = ({id}) => {
            let engines = this.props.engines.slice()

            engines.splice(id, 1)
            setting.set('engines.list', engines)
        }

        this.handleAddButtonClick = evt => {
            evt.preventDefault()

            let engines = this.props.engines.slice()

            engines.unshift({name: '', path: '', args: ''})
            setting.set('engines.list', engines)

            this.setState({}, () => {
                this.element.querySelector('.engines-list li:first-child input').focus()
            })
        }
    }

    render({engines}) {
        return h('div', {ref: el => this.element = el, class: 'engines'},
            h('div', {class: 'gtp-console-log'},
                h('ul', {},
                    h(PreferencesItem, {
                        id: 'gtp.console_log_enabled',
                        text: t('Enable GTP logging to directory:')
                    }),

                    h(PathInputItem, {
                        id: 'gtp.console_log_path',
                        chooseDirectory: true
                    })
                )
            ),
            h('div', {class: 'engines-list'},
                h('ul', {}, engines.map(({name, path, args, commands}, id) =>
                    h(EngineItem, {
                        id,
                        name,
                        path,
                        args,
                        commands,

                        onChange: this.handleItemChange,
                        onRemove: this.handleItemRemove
                    })
                ))
            ),

            h('p', {},
                h('button', {type: 'button', onClick: this.handleAddButtonClick}, t('Add'))
            )
        )
    }
}

class PreferencesDrawer extends Component {
    constructor() {
        super()

        this.handleCloseButtonClick = evt => {
            evt.preventDefault()
            sabaki.closeDrawer()
        }

        this.handleTabClick = evt => {
            let tabs = ['general', 'themes', 'engines']
            let tab = tabs.find(x => evt.currentTarget.classList.contains(x))

            sabaki.setState({preferencesTab: tab})
        }
    }

    shouldComponentUpdate({show}) {
        return show || show !== this.props.show
    }

    componentDidUpdate(prevProps) {
        if (prevProps.show && !this.props.show) {
            // On closing

            let natsort = require('natsort')
            let cmp = natsort({insensitive: true})

            // Sort engines

            let engines = [...this.props.engines].sort((x, y) => cmp(x.name, y.name))

            setting.set('engines.list', engines)

            // Don't create an empty log file

            if (sabaki.attachedEngineSyncers.some(x => x != null)) {
                if (!gtplogger.updatePath()) {
                    // Force the user to fix the issue

                    setTimeout(() => {
                        sabaki.setState({preferencesTab: 'engines'})
                        sabaki.openDrawer('preferences')
                    }, 500)

                    return
                }
            }

            // Reset tab selection

            setTimeout(() => sabaki.setState({preferencesTab: 'general'}), 500)
        }
    }

    render({show, tab, engines, graphGridSize}) {
        return h(Drawer,
            {
                type: 'preferences',
                show
            },

            h('ul', {class: 'tabs'},
                h('li', {
                        class: classNames({general: true, current: tab === 'general'}),
                        onClick: this.handleTabClick
                    },

                    h('a', {href: '#'}, t('General'))
                ),
                h('li',
                    {
                        class: classNames({themes: true, current: tab === 'themes'}),
                        onClick: this.handleTabClick
                    },

                    h('a', {href: '#'}, t('Themes'))
                ),
                h('li',
                    {
                        class: classNames({engines: true, current: tab === 'engines'}),
                        onClick: this.handleTabClick
                    },

                    h('a', {href: '#'}, t('Engines'))
                )
            ),

            h('form', {class: classNames(tab, 'tab-content')},
                h(GeneralTab, {graphGridSize}),
                h(ThemesTab),
                h(EnginesTab, {engines}),

                h('p', {},
                    h('button', {type: 'button', onClick: this.handleCloseButtonClick}, t('Close'))
                )
            )
        )
    }
}

module.exports = PreferencesDrawer
