import discord
from discord.ext import commands
from discord.ext.commands import Bot
import asyncio
import time
import logging

Client = discord.Client()
client = commands.Bot(command_prefix = "+")
@client.event
async def on_ready():
    print("Bot is ready!")
    print("BIENVENIIIIIDOOOOOOOOO")
@client.event
async def on_message(message):
  if message.content == "hacemeunhuevofrito":
        await client.send_message(message.channel, "Y por qué no te haces una teta al horno!")
@client.event
async def on_member_join(member):
    channel = member.server.default_channel
    mensajito = "Bienvenido a axelonburgo", format(member.name, member.server.name)
    await client.send_message(channel, mensajito)


client.run("NDk0MDE5OTE4MDAyMzg4OTkz.Dotpvw.kLkLuMP5KxFDvI0zyk-LAVuOcPc")
