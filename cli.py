#!/usr/bin/env python

import click
import os
import subprocess


@click.group()
def cli():
    pass


@click.command()
@click.option('--name', default="realtime-ai-character", help='The name to give to your Docker image.')
@click.option('--rebuild', is_flag=True, help='Flag to indicate whether to rebuild the Docker image.')
def docker_build(name, rebuild):
    if rebuild or not image_exists(name):
        click.secho(f"Building Docker image: {name}...", fg='green')
        if (image_exists(name)):
            subprocess.run(["docker", "rmi", "-f", name])
        subprocess.run(["docker", "build", "-t", name, "."])
    else:
        click.secho(
            f"Docker image: {name} already exists. Skipping build.", fg='yellow')


@click.command()
@click.option('--name', default="realtime-ai-character", help='The name of the Docker image to run.')
@click.option('--db-file', default="./test.db", help='Path to the database file to mount inside the container.')
def docker_run(name, db_file):
    click.secho(f"Running Docker image: {name}...", fg='green')
    if not os.path.isfile('.env'):
        click.secho(
            "Warning: .env file not found. Running without environment variables.", fg='yellow')
    # Remove existing container if it exists
    subprocess.run(["docker", "rm", "-f", name],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["docker", "run", "--env-file", ".env", "--name", name, "-p", "8000:8000",
                   "-v", f"{os.path.abspath(db_file)}:/realtime_ai_character/test.db", name])


@click.command()
@click.option('--name', default="realtime-ai-character", help='The name of the Docker image to delete.')
def docker_delete(name):
    if image_exists(name):
        click.secho(f"Deleting Docker image: {name}...", fg='green')
        subprocess.run(["docker", "rmi", "-f", name])
    else:
        click.secho(f"Docker image: {name} does not exist.", fg='yellow')


@click.command(context_settings={"ignore_unknown_options": True})
@click.argument('args', nargs=-1, type=click.UNPROCESSED)
def run_uvicorn(args):
    click.secho("Running uvicorn server...", fg='green')
    subprocess.run(["uvicorn", "realtime_ai_character.main:app",
                   "--host", "0.0.0.0"] + list(args))


def image_exists(name):
    result = subprocess.run(
        ["docker", "image", "inspect", name], capture_output=True, text=True)
    return result.returncode == 0


cli.add_command(docker_build)
cli.add_command(docker_run)
cli.add_command(docker_delete)
cli.add_command(run_uvicorn)


if __name__ == '__main__':
    cli()
