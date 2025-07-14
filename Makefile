.DEFAULT_GOAL:=help
.PHONY: init start help

init: ## Init the project
	npm install

start: node_modules ## Start dev server
	npm start

node_modules: package.json
	npm install
	@touch node_modules
	
help: ## Print the help about targets
	@printf "Usage:             make [\033[34mtarget\033[0m]\n"
	@printf "Default:           \033[34m%s\033[0m\n" $(.DEFAULT_GOAL)
	@printf "Targets:\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf " \033[34m%-17s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | sort
