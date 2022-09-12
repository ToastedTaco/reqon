import chalk from 'chalk'
import { homedir } from 'os'
import express, { Application, Request, Response } from 'express'
import minimist, { ParsedArgs } from 'minimist'
import prettyMs from 'pretty-ms'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { Low, JSONFile } from 'lowdb'
import { existsSync, mkdirSync } from 'fs'
import Entry from './Interfaces/Entry.js'
import Interceptor from './Listeners/Interceptor.js'

export default class Reqon {
    db: null|Low<{ entries: Entry[] }>
    args: ParsedArgs
    reqonDir: string
    listener: Application
    dashboard: Application

    static run(): void {
        const reqon = new Reqon()
        reqon.setup()
            .then(() => {
                reqon.drawTitle()
                    .initListener()
                    .initDashboard()
            })
    }
    constructor() {
        this.reqonDir = join(homedir(), '.reqon')
        if (!existsSync(this.reqonDir)) {
            mkdirSync(this.reqonDir)
        }

        this.args = minimist(process.argv.slice(2), {
            string: [
                'port',
                'dashboard-port',
                'save-max',
                'save-file',
                'help',
            ],
            boolean: [
                'save',
                'dashboard'
            ],
            default: {
                'port': 8080,
                'dashboard-port': 8081,
                'save-max': 100,
                'save-file': join(this.reqonDir, 'db.json'),
                'save': true,
                'dashboard': true
            },
            alias: {
                v: 'help'
            }
        })

        this.listener = express()
        this.dashboard = express()

        this.db = null
        if (this.args['save'] !== false) {
            const adapter = new JSONFile<{ entries: Entry[] }>(this.args['save-file'])
            this.db = new Low(adapter)
        }
    }
    async setup(): Promise<Reqon> {
        process.stdout.write(
            String.fromCharCode(27) + "]0;" + "reqon - listening" + String.fromCharCode(7)
        )

        if (this.db) {
            await this.db.read()
            this.db.data ||= { entries: [] }
        }

        if (this.args.hasOwnProperty('help')) {
            this.drawTitle()
                .drawHelp()
        }

        return this
    }
    drawHelp(): void {
        console.log(chalk.cyan.bold("Description: ") + chalk.white("effortlessly intercept and inspect http requests."))
        console.log("")
        console.log(chalk.cyan.bold("Usage: ") + chalk.white("reqon ") + chalk.gray("[options]"))
        console.log("")
        console.log(chalk.cyan.bold("Options: "))
        console.log(chalk.white("  --port=<port>") + "               " + chalk.gray("sets the port to listen for incoming requests"))
        console.log(chalk.white("  --dashboard-port=<port>") + "     " + chalk.gray("sets the port the dashboard is available on"))
        console.log(chalk.white("  --save-max=<number>") + "         " + chalk.gray("changes the max number of entries saved locally"))
        console.log(chalk.white("  --save-file=<path>") + "          " + chalk.gray("changes the filepath used for local db, json ext required"))
        console.log(chalk.white("  --no-dashboard") + "              " + chalk.gray("disables the dashboard, --dashboard-port is ignored"))
        console.log(chalk.white("  --no-save") + "                   " + chalk.gray("disables saving locally, --save-file + --save-max ignored"))
        console.log(chalk.white("  --help") + "                      " + chalk.gray("what you're seeing right now :)"))
        console.log("")
        process.exit()
    }
    drawTitle(): Reqon {
        console.clear()
        console.log('')
        console.log(chalk.cyan.bold("┏━┓ ┏━━┓ ┏━━┓ ┏━━┓ ┏━┓ "))
        console.log(chalk.cyan.bold("┃┏┛ ┃┃━┫ ┃┏┓┃ ┃┏┓┃ ┃┏┓┓"))
        console.log(chalk.cyan.bold("┃┃  ┃┃━┫ ┃┗┛┃ ┃┗┛┃ ┃┃┃┃"))
        console.log(chalk.cyan.bold("┗┛  ┗━━┛ ┗━┓┃ ┗━━┛ ┗┛┗┛"))
        console.log(chalk.cyan.bold("           ┗┛          "))
        console.log('')

        return this
    }
    initListener(): Reqon {
        this.listener.use(express.json())
        this.listener.use(express.urlencoded({ extended: true })) 

        this.listener.all('/*', (req: Request, res: Response) => {
            Interceptor.handle(req, res, this.db, this.args)
        })

        this.listener.listen(this.args['port'], () => {
            console.log(chalk.white('Listening for new requests'))
            console.log(chalk.cyan.bold.underline(`http://localhost:${this.args['port']}`))
            console.log('')
        })

        return this
    }
    initDashboard(): Reqon {
        this.dashboard.set('view engine', 'ejs')
        this.dashboard.set('views', join(dirname(fileURLToPath(import.meta.url)), '../lib/Views'))
        this.dashboard.get('/', (req: Request, res: Response) => {
            res.render('dashboard', {
                prettyMs: prettyMs,
                entries: this.db?.data?.entries.slice().sort((a: Entry, b: Entry) => new Date(b.date).valueOf() - new Date(a.date).valueOf())
            })
        })

        if (this.args['dashboard'] !== false) {
            this.dashboard.listen(this.args['dashboard-port'], () => {
                console.log(chalk.white('View requests in the dashboard'))
                console.log(chalk.cyan.bold.underline(`http://localhost:${this.args['dashboard-port']}`))
                console.log('')
            })
        }

        return this
    }
}
