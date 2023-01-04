# node-akeneo-syncce

Syncs data between two Community Edition Akeneo PIMs

## Installation

```
$ git clone https://github.com/donaldbales/node-akeneo-syncce.git
$ cd node-akeneo-syncce
$ npm run build
```

## Configuration

### Environment Variables

You need to set these environment variables:

```
export LOG_LEVEL=info
export PIM1_AKENEO_EXPORT_PATH=data/pim1
mkdir -p $PIM1_AKENEO_EXPORT_PATH
export PIM2_AKENEO_EXPORT_PATH=data/pim2
mkdir -p $PIM2_AKENEO_EXPORT_PATH

#
# From
#

export PIM1_AKENEO_BASE_URL=<primary pim>
export PIM1_AKENEO_CLIENT_ID=<client id>
export PIM1_AKENEO_PASSWORD=<password>
export PIM1_AKENEO_SECRET=<secret>
export PIM1_AKENEO_USERNAME=<username>

#
# To
#

export PIM2_AKENEO_BASE_URL=<secondary pim>
export PIM2_AKENEO_CLIENT_ID=<client id>
export PIM2_AKENEO_PASSWORD=<password>
export PIM2_AKENEO_SECRET=<secret>
export PIM2_AKENEO_USERNAME=<username>
```

Client ID, Secret, Username, and Password are supplied in Akeneo PIM Connections screen after you create a connection.

When you set the LOG_LEVEL to debug, in addition to more logging detail, the HTTP methods save their raw responses to a file named after the method.

## Execution

```
node --max-old-space-size=16384 --unhandled-rejections=strict src/index

```

## Support

Supports Node versions 12+.

I know full well that some people consider publishing the generated Javascript code for Typescript a bad practice, but not everyone knows Typescript. So yes, I'm bad.

Feel free to email don@donaldbales.com with and complaints, questions, and suggestions.
