install:
	$(MAKE) -C frontend install
	$(MAKE) -C backend install
	$(MAKE) -C e2e install

dev:
	trap 'kill 0' INT TERM EXIT; \
	$(MAKE) -C backend dev & \
	$(MAKE) -C frontend dev & \
	wait

build:
	$(MAKE) -C frontend build
	$(MAKE) -C backend build

format:
	$(MAKE) -C frontend format

lint:
	$(MAKE) -C frontend lint
	$(MAKE) -C backend lint
	$(MAKE) -C e2e lint

typecheck:
	$(MAKE) -C frontend typecheck
	$(MAKE) -C backend typecheck
	$(MAKE) -C e2e typecheck

test-e2e:
	$(MAKE) -C e2e test

clean:
	$(MAKE) -C frontend clean
	$(MAKE) -C backend clean
	$(MAKE) -C e2e clean

check: lint typecheck build test-e2e
