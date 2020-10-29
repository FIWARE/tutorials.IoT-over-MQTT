# Copyright 2015 Telefónica Investigación y Desarrollo, S.A.U
#
# This file is part of the IoT Agent for the Ultralight 2.0 protocol (IOTAUL) component
#
# IOTAUL is free software: you can redistribute it and/or
# modify it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the License,
# or (at your option) any later version.
#
# IOTAUL is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License along with IOTAUL.
# If not, see http://www.gnu.org/licenses/.
#
# For those usages not covered by the GNU Affero General Public License
# please contact with: [daniel.moranjimenez@telefonica.com]

ARG NODE_VERSION=10
ARG GITHUB_ACCOUNT=telefonicaid
ARG GITHUB_REPOSITORY=iotagent-ul
ARG DOWNLOAD=latest
ARG SOURCE_BRANCH=master

########################################################################################
#
# This build stage retrieves the source code from GitHub. The default download is the 
# latest tip of the master of the named repository on GitHub.
#
# To obtain the latest stable release run this Docker file with the parameters:
# --no-cache --build-arg DOWNLOAD=stable
#
# To obtain any specific version of a release run this Docker file with the parameters:
# --no-cache --build-arg DOWNLOAD=1.7.0
#
# For development purposes, to create a development image including a running Distro, 
# run this Docker file with the parameter:
#
# --target=builder
#
######################################################################################## 
FROM node:${NODE_VERSION} AS builder
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG DOWNLOAD
ARG SOURCE_BRANCH

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# As an Alternative for local development, just copy this Dockerfile into file the root of 
# the repository and replace the whole RUN statement below by the following COPY statement 
# in your local source using :
#
# COPY . /opt/iotaul/
#

# hadolint ignore=DL3008
RUN \
	# Ensure that unzip is installed prior to downloading
	apt-get install -y --no-install-recommends unzip && \
	if [ "${DOWNLOAD}" = "latest" ] ; \
	then \
		RELEASE="${SOURCE_BRANCH}"; \
		echo "INFO: Building Latest Development from ${SOURCE_BRANCH} branch."; \
	elif [ "${DOWNLOAD}" = "stable" ]; \
	then \
		RELEASE=$(curl -s https://api.github.com/repos/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/releases/latest | grep 'tag_name' | cut -d\" -f4); \
		echo "INFO: Building Latest Stable Release: ${RELEASE}"; \
	else \
	 	RELEASE="${DOWNLOAD}"; \
	 	echo "INFO: Building Release: ${RELEASE}"; \
	fi && \
	RELEASE_CONCAT=$(echo "${RELEASE}" | tr / -); \
	curl -s -L https://github.com/"${GITHUB_ACCOUNT}"/"${GITHUB_REPOSITORY}"/archive/"${RELEASE}".zip > source.zip && \
	unzip source.zip -x "*/test/**" "*/rpm/**" "*/ghpages/**" "*/docs/**" "*/.*" && \
	rm source.zip && \
	mv "${GITHUB_REPOSITORY}-${RELEASE_CONCAT}" /opt/iotaul && \
	# Remove unzip and clean apt cache
	apt-get clean && \
	apt-get remove -y unzip && \
	apt-get -y autoremove && \
	rm -rf /var/lib/apt/lists/* 

WORKDIR /opt/iotaul
COPY package.json .

# hadolint ignore=DL3008
RUN \
	# Ensure that Git is installed prior to running npm install
	apt-get install -y --no-install-recommends git && \
	echo "INFO: npm install --production..." && \
	npm install --only=prod --no-package-lock --no-optional && \
	# Remove Git and clean apt cache
	apt-get clean && \
	apt-get remove -y git && \
	apt-get -y autoremove

########################################################################################
#
# This build stage installs PM2 if required.
# 
# To create an image using PM2 run this Docker file with the parameter:
#
# --target=pm2-install
#
########################################################################################
FROM node:${NODE_VERSION}-slim AS pm2
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION

LABEL "maintainer"="FIWARE IoTAgent Team. Telefónica I+D"
LABEL "org.opencontainers.image.authors"="iot_support@tid.es"
LABEL "org.opencontainers.image.documentation"="https://fiware-iotagent-ul.rtfd.io/"
LABEL "org.opencontainers.image.vendor"="Telefónica Investigación y Desarrollo, S.A.U"
LABEL "org.opencontainers.image.licenses"="AGPL-3.0-only"
LABEL "org.opencontainers.image.title"="IoT Agent for the Ultralight 2.0 protocol with pm2"
LABEL "org.opencontainers.image.description"="An Internet of Things Agent for the Ultralight 2.0 protocol (with AMQP, HTTP and MQTT transports). This IoT Agent is designed to be a bridge between Ultralight and the NGSI interface of a context broker."
LABEL "org.opencontainers.image.source"="https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}"
LABEL "org.nodejs.version"="${NODE_VERSION}"

COPY --from=builder /opt/iotaul /opt/iotaul
RUN npm install pm2@4.4.0 -g --no-package-lock --no-optional

USER node
ENV NODE_ENV=production
# Expose 4061 for NORTH PORT, 7896 for HTTP PORT
EXPOSE ${IOTA_NORTH_PORT:-4061} ${IOTA_HTTP_PORT:-7896}
CMD ["pm2-runtime", "/opt/iotaul/bin/iotagent-ul", "-- ", "config.js"]

########################################################################################
#
# This build stage creates an anonymous user to be used with the distroless build
# as defined below.
#
########################################################################################
FROM node:${NODE_VERSION}-slim AS anon-user
RUN sed -i -r "/^(root|nobody)/!d" /etc/passwd /etc/shadow /etc/group \
    && sed -i -r 's#^(.*):[^:]*$#\1:/sbin/nologin#' /etc/passwd

########################################################################################
#
# This build stage creates a distroless image for production.
#
# IMPORTANT: For production environments use Docker Secrets to protect values of the 
# sensitive ENV variables defined below, by adding _FILE to the name of the relevant 
# variable.
#
# - IOTA_AUTH_USER, IOTA_AUTH_PASSWORD - when using Keystone Security 
# - IOTA_AUTH_CLIENT_ID, IOTA_AUTH_CLIENT_SECRET - when using OAuth2 Security
#
########################################################################################
FROM gcr.io/distroless/nodejs:${NODE_VERSION} AS distroless
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION

LABEL "maintainer"="FIWARE IoTAgent Team. Telefónica I+D"
LABEL "org.opencontainers.image.authors"="iot_support@tid.es"
LABEL "org.opencontainers.image.documentation"="https://fiware-iotagent-ul.rtfd.io/"
LABEL "org.opencontainers.image.vendor"="Telefónica Investigación y Desarrollo, S.A.U"
LABEL "org.opencontainers.image.licenses"="AGPL-3.0-only"
LABEL "org.opencontainers.image.title"="IoT Agent for the Ultralight 2.0 protocol (Distroless)"
LABEL "org.opencontainers.image.description"="An Internet of Things Agent for the Ultralight 2.0 protocol (with AMQP, HTTP and MQTT transports). This IoT Agent is designed to be a bridge between Ultralight and the NGSI interface of a context broker."
LABEL "org.opencontainers.image.source"="https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}"
LABEL "org.nodejs.version"="${NODE_VERSION}"

COPY --from=builder /opt/iotaul /opt/iotaul
COPY --from=anon-user /etc/passwd /etc/shadow /etc/group /etc/
WORKDIR /opt/iotaul

USER nobody
ENV NODE_ENV=production
# Expose 4061 for NORTH PORT, 7896 for HTTP PORT
EXPOSE ${IOTA_NORTH_PORT:-4061} ${IOTA_HTTP_PORT:-7896}
CMD ["./bin/iotagent-ul", "-- ", "config.js"]
HEALTHCHECK  --interval=30s --timeout=3s --start-period=10s \
  CMD ["/nodejs/bin/node", "./bin/healthcheck"]

########################################################################################
#
# This build stage creates a node-slim image for production.
#
# IMPORTANT: For production environments use Docker Secrets to protect values of the 
# sensitive ENV variables defined below, by adding _FILE to the name of the relevant 
# variable.
#
# - IOTA_AUTH_USER, IOTA_AUTH_PASSWORD - when using Keystone Security 
# - IOTA_AUTH_CLIENT_ID, IOTA_AUTH_CLIENT_SECRET - when using OAuth2 Security
#
########################################################################################
FROM node:${NODE_VERSION}-slim AS slim
ARG GITHUB_ACCOUNT
ARG GITHUB_REPOSITORY
ARG NODE_VERSION

LABEL "maintainer"="FIWARE IoTAgent Team. Telefónica I+D"
LABEL "org.opencontainers.image.authors"="iot_support@tid.es"
LABEL "org.opencontainers.image.documentation"="https://fiware-iotagent-ul.rtfd.io/"
LABEL "org.opencontainers.image.vendor"="Telefónica Investigación y Desarrollo, S.A.U"
LABEL "org.opencontainers.image.licenses"="AGPL-3.0-only"
LABEL "org.opencontainers.image.title"="IoT Agent for the Ultralight 2.0 protocol"
LABEL "org.opencontainers.image.description"="An Internet of Things Agent for the Ultralight 2.0 protocol (with AMQP, HTTP and MQTT transports). This IoT Agent is designed to be a bridge between Ultralight and the NGSI interface of a context broker."
LABEL "org.opencontainers.image.source"="https://github.com/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY}"
LABEL "org.nodejs.version"="${NODE_VERSION}"

COPY --from=builder /opt/iotaul /opt/iotaul
WORKDIR /opt/iotaul

USER node
ENV NODE_ENV=production
# Expose 4061 for NORTH PORT, 7896 for HTTP PORT
EXPOSE ${IOTA_NORTH_PORT:-4061} ${IOTA_HTTP_PORT:-7896}
CMD ["node", "/opt/iotaul/bin/iotagent-ul", "-- ", "config.js"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
   CMD ["npm", "run", "healthcheck"]
