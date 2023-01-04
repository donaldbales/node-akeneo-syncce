#!/bin/bash

export LOG_LEVEL=info
export PIM1_AKENEO_EXPORT_PATH=data/pim1
mkdir -p $PIM1_AKENEO_EXPORT_PATH
export PIM2_AKENEO_EXPORT_PATH=data/pim2
mkdir -p $PIM2_AKENEO_EXPORT_PATH

#
# From
#

export PIM1_AKENEO_BASE_URL="http://localhost:8081"
export PIM1_AKENEO_CLIENT_ID=5_6cyzd9ybuog8wo8kcwggw80s84kgkk8co4g4008w0kkc0c08wg
export PIM1_AKENEO_PASSWORD=746369602
export PIM1_AKENEO_SECRET=5fcde1b0ogkc4ckogowwok4ogwk84ws888c4koc48k8sw04wks
export PIM1_AKENEO_USERNAME=pim_1_7883

#
# To
#

export PIM2_AKENEO_BASE_URL="http://localhost:8082"
export PIM2_AKENEO_CLIENT_ID=1_223cnh04aqdc080wkk8cg0k00g4scgw0ksg0wo44wk0o0k4sg8
export PIM2_AKENEO_PASSWORD=36962d3ae
export PIM2_AKENEO_SECRET=uqgi2t3b61w440c4c0sow8www0sgcss4cwocwsogkgwwcswww
export PIM2_AKENEO_USERNAME=pim2_6749

node --max-old-space-size=16384 --unhandled-rejections=strict src/index
