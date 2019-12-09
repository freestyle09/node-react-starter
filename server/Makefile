build:
	docker build -t damian0o/cicada:server .

run:
	docker run -d --rm --name cicada-server-1 -p 8080:8080 damian0o/cicada:server

push:
	docker push damian0o/cicada:server

rm:
	docker rm -f cicada-server-1