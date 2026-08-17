.PHONY: install dev tunnel frontend backend build format lint typecheck test-e2e test clean check

install:
	$(MAKE) -C frontend install
	$(MAKE) -C backend install
	$(MAKE) -C e2e install

dev:
	@set -eu; \
	frontend_pid=; backend_pid=; tunnel_pid=; \
	cleanup() { \
		for pid in $$frontend_pid $$backend_pid $$tunnel_pid; do \
			if [ -n "$$pid" ]; then kill "$$pid" 2>/dev/null || true; fi; \
		done; \
	}; \
	trap cleanup EXIT; \
	trap 'exit 130' INT TERM; \
	if printf '%s\n' "$(MAKECMDGOALS)" | grep -qw tunnel; then \
		command -v cloudflared >/dev/null 2>&1 || { \
			echo 'cloudflared が見つかりません。先に brew install cloudflared を実行してください。' >&2; \
			exit 1; \
		}; \
		VITE_API_BASE_URL= $(MAKE) -C frontend dev & \
		frontend_pid=$$!; \
	else \
		$(MAKE) -C frontend dev & \
		frontend_pid=$$!; \
	fi; \
	$(MAKE) -C backend dev & \
	backend_pid=$$!; \
	if printf '%s\n' "$(MAKECMDGOALS)" | grep -qw tunnel; then \
		echo 'Cloudflare Quick Tunnel を起動します。表示された trycloudflare.com のURLをスマホで開いてください。'; \
		cloudflared tunnel --url http://127.0.0.1:5173 & \
		tunnel_pid=$$!; \
	fi; \
	wait

# `make dev tunnel` の tunnel は dev にトンネル起動を伝えるマーカーです。
tunnel:
	@:

frontend:
	$(MAKE) -C frontend dev

backend:
	$(MAKE) -C backend dev

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

test: test-e2e

clean:
	$(MAKE) -C frontend clean
	$(MAKE) -C backend clean
	$(MAKE) -C e2e clean

check: lint typecheck build test-e2e
