FROM lscr.io/linuxserver/baseimage-kasmvnc:alpine321
LABEL org.opencontainers.image.title="Alpy"       org.opencontainers.image.description="Tiny cloud-first Alpine desktop"       org.opencontainers.image.source="https://github.com/pauldevilliers/alpy"
RUN apk add --no-cache bash curl git jq nano openssh-client python3 py3-pip tmux xfce4-terminal thunar chromium font-noto font-noto-emoji ca-certificates
COPY root/ /
RUN chmod +x /etc/cont-init.d/10-alpy /defaults/autostart && mkdir -p /config/Desktop /config/Projects /config/Documents /config/Downloads
ENV TITLE="Alpy" NO_DECOR=1 NO_FULL=1 FM_HOME=/config CUSTOM_USER=alpy
EXPOSE 3000
