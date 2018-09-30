import discord
from aiohttp.client_exceptions import ClientConnectorError
from json import load, dump, decoder
from argparse import ArgumentParser
from discord.ext import commands
from random import randint
from sys import modules
from os import replace, makedirs
from os.path import splitext, exists


def parse_cmd_arguments():
    parser = ArgumentParser(description="Explosive-Bot")
    parser.add_argument("--test-run",  # test run flag for Travis
                        action="store_true",
                        help="Makes the bot quit before trying to log in")
    parser.add_argument("--reset-config",  # Reset bot config
                        action="store_true",
                        help="Reruns the setup")
    parser.add_argument("--no-prompt",
                        action="store_true",
                        help="Supresses all errors")
    parser.add_argument("--no-run",
                        action="store_true",
                        help="Runs all bot related code but never the bot")
    return parser


args = parse_cmd_arguments().parse_args()
_reset_cfg = args.reset_config
_no_prompt = args.no_prompt
_test_run = args.test_run
_no_run = args.no_run

def setup(InvalidToken=False, cfg=None):

    if _no_prompt:
        print("Can not run Setup with no prompt")
        exit(0)

    if not cfg or (not 'TOKEN' in cfg or not 'PREFIX' in cfg or not 'DESCRIPTION' in cfg):
        config = {
            'TOKEN':'',
            'PREFIX':[],
            'DESCRIPTION':''
            }
    else:
        config = cfg

    if not _test_run:
        if InvalidToken:
            print('The Token is incorrect')
        else:
            print('Enter your bot Token')
        config["TOKEN"] = input('>')

        while not config["PREFIX"]:
            print('\nEnter the prefix you want to use.\n'
                  'You can setup multiple prefixes by putting a space between them')

            config["PREFIX"] = input('>').split()
            if not config["PREFIX"]:
                print("Empty command prefixes are invalid.")

        if not config['DESCRIPTION']:
            print('\nEnter a description for your bot.\n'
                  'It will show up with the help message')

            config["DESCRIPTION"] = input('>')

    path, ext  = splitext('data/bot/config.json')
    tmp_file = "{}.{}.tmp".format(path, randint(1000, 9999))
    with open(tmp_file, 'w', encoding='utf-8') as tmp:
        dump(config, tmp, indent=4, sort_keys=True, separators=(',', ' : '))
    try:
        with open(tmp_file, 'r', encoding='utf-8') as tmp:
            config = load(tmp)
    except decoder.JSONDecodeError:
        print("Attempted to load file {} but JSON "
              "integrity check on tmp file has failed. "
              "The original file is unaltered."
              "".format('data/bot/config.json'))
    except Exception as e:
        print('A issue has occured loading ' + 'data/bot/config.json' + '.\n'
              'Traceback:\n'
              '{0} {1}'.format(str(e), e.args))

    replace(tmp_file, 'data/bot/config.json')
    return config

def check_folders():
    folders = ("data", "data/bot/", "cogs")
    for folder in folders:
        if not exists(folder):
            print("Creating " + folder + " folder...")
            makedirs(folder)

async def send_help(ctx):
    helpm = await bot.formatter.format_help_for(ctx, ctx.command)
    for m in helpm:
        await ctx.send(m)

def preparebot():
    global bot
    bot = commands.Bot(command_prefix=config['PREFIX'],
                       description=config['DESCRIPTION'],
                       pm_help=None)

    from compatibility import __init__

    class Checks:
        def __init__(self):
            pass

        def _check_owner(self, ctx):
            return ctx.message.author.id == bot.owner.id
        def owner(self):
            return commands.check(self._check_owner)

        is_owner = owner

    checks = Checks()

    async def info():
        info = await bot.application_info()
        bot.owner = info.owner
        bot.client_id = info.id
        bot.oauth_url = "https://discordapp.com/oauth2/authorize?client_id={}&scope=bot".format(bot.client_id)

        bot.formatter = commands.formatter.HelpFormatter()

    @commands.group()
    @checks.owner()
    async def load(ctx):
        if ctx.invoked_subcommand:
            pages = await bot.formatter.format_help_for(ctx, ctx.command)
            for page in pages:
                await ctx.send(page)

    @load.command(name="cog")
    @checks.owner()
    async def _norm(ctx, *, msg):
        """Load a cog structured like any other"""
        await loadcog(ctx, "cogs.{}".format(msg), msg, "cogs/{}.py".format(msg))

    @load.command(name="cog3", pass_context=True)
    async def _red3(ctx, *, msg):
        """Load a Red Version 3 cog"""
        await loadcog(ctx, "cogs.{}".format(msg), msg, "cogs/{}/__init__.py".format(msg))

    async def loadcog(ctx, cog, msg, check):
        try:
            if exists(check):
                bot.load_extension(cog)
            else:
                raise ImportError("No cog named '{}'".format(msg))
        except Exception as e:
            await ctx.send('Failed to load module: `{}`'.format(msg))
            print('Failed to load module: `{}`'.format(msg))
            print('{}: {}'.format(type(e).__name__, e))
        else:
            await ctx.send('Loaded module: `{}`'.format(msg))

    @commands.command(pass_context=True)
    @checks.owner()
    async def unload(ctx, *, msg):
        """Unload a module"""
        try:
            if (exists("cogs/{}.py".format(msg)) or exists("cogs/{}.pyw".format(msg))):
                bot.unload_extension("cogs.{}".format(msg))
            else:
                raise ImportError("No module named '{}'".format(msg))
        except Exception as e:
            await ctx.send('Failed to unload module: `{}.py`'.format(msg))
            print('Failed to unload module: `{}.py`'.format(msg))
            print('{}: {}'.format(type(e).__name__, e))
        else:
            await ctx.send('Unloaded module: `{}.py`'.format(msg))

    @commands.command()
    @checks.owner()
    async def exit(ctx):
        """Load a module."""
        await ctx.send('Bye')
        await bot.logout()


    @bot.event
    async def on_ready():
        await info()
        guilds = len(bot.guilds)
        prefixes = config['PREFIX']
        channels = len([x for x in bot.get_all_channels()])
        users = len(set(bot.get_all_members()))

        msg = '\n' + str(bot.user.name)
        msg += '\n' + '{}#{}\n'.format(str(bot.owner.name),
                                       str(bot.owner.discriminator))

        msg += "\nPrefix" + ('es' if len(prefixes) > 1 else '') + ': ' + ", ".join(prefixes) + '\n'
        msg += '\nConnected to:'
        msg += '\n{} guild'.format(guilds) + ('s' if guilds > 1 else '')
        msg += '\n{} channel'.format(channels) + ('s' if channels > 1 else '')
        msg += '\n{} user'.format(users) + ('s' if users > 1 else '')


        msg += '\n\nInvite:\n{}'.format(bot.oauth_url)
        print(msg)
        bot.add_command(load)
        bot.add_command(unload)
        bot.add_command(exit)

    @bot.event
    async def on_command_error(ctx, error):
        if _no_prompt:
            return
        if isinstance(error, (commands.MissingRequiredArgument, commands.BadArgument)):
            await send_help(ctx)
        elif isinstance(error, commands.CheckFailure):
            pass

    return bot

if __name__ == '__main__':

    check_folders()
    print("Starting up...")

    while True:

        if _test_run:
            try:
                setup()
                print("Test run complete")
                exit(0)
            except Exception as e:
                print('{}\n{}\n'.format(type(e).__name__, e))
                print("Test failed")
                exit(1)

        if _reset_cfg:
            config = setup()
        else:
            try:
                with open('data/bot/config.json', 'r', encoding='utf-8') as f:
                    config = load(f)
            except IOError:
                config = setup()

        try:
            bot = preparebot()
            if _no_run:
                print("Bot start skipped")
            else:
                bot.run(config['TOKEN'])
        except discord.errors.LoginFailure:
            setup(True, config)
            continue
        except ClientConnectorError:
            print("Could not connect to Discord. Make sure you are connected to the internet")
            exit(0)
        except KeyboardInterrupt:
            print('exiting...')
            exit(0)

        break
