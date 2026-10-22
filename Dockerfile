FROM nginx:1.28-alpine
ARG RELEASE=1.0
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css water.js app.js /usr/share/nginx/html/
RUN sed -i "s/Release 1.0/Release ${RELEASE}/" /usr/share/nginx/html/index.html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -q -O - http://127.0.0.1:8080/healthz || exit 1
