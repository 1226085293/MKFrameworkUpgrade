import fs from "fs-extra";
import { glob } from "glob";
import path from "path";
import { argv } from "process";

(async () => {
	const rootDir = argv[2];

	if (!rootDir || !fs.existsSync(rootDir)) {
		console.error("请提供有效的项目根目录路径");
		return;
	}

	console.log(
		"请确保在执行脚本前有项目的备份，以防止意外情况导致数据丢失。5秒后开始处理，按Ctrl+C取消。"
	);
	await new Promise((resolve) => setTimeout(resolve, 5000));

	// 导入映射
	try {
		(() => {
			let projectTab = fs.readJSONSync(
				`${rootDir}/settings/v2/packages/project.json`,
				"utf-8"
			);
			let importFilePath = path.join(
				rootDir,
				projectTab.script.importMap.replace("project://", "")
			);
			let importTab = fs.readJSONSync(importFilePath, "utf-8");

			delete importTab.imports["mk"];
			delete importTab.imports["global_config"];
			delete importTab.imports["global_event"];
			importTab.imports.mk =
				"./extensions/MKFramework/assets/MKFramework/Framework/MKInit.ts";
			importTab.imports.GlobalConfig =
				"./extensions/MKFramework/assets/MKFramework/Config/GlobalConfig.ts";
			importTab.imports.globalEvent =
				"./extensions/MKFramework/assets/MKFramework/Config/GlobalEvent.ts";
			fs.writeJSONSync(importFilePath, importTab, { spaces: "\t" });
			console.log("处理导入映射 Success");
		})();
	} catch (error) {
		console.error("处理导入映射 Error:", error);
	}
	// TS配置
	try {
		(() => {
			let tsconfig = fs.readFileSync(`${rootDir}/tsconfig.json`, "utf-8");

			tsconfig = tsconfig
				.replace(
					/"mk":([^]+?])/g,
					`"mk": ["./extensions/MKFramework/@types/MKFramework/mk.d.ts"]`
				)
				.replace(
					/"global_config":([^]+?])/g,
					`"GlobalConfig": ["./extensions/MKFramework/assets/MKFramework/Config/GlobalConfig.ts"]`
				)
				.replace(
					/"global_event":([^]+?])/g,
					`"globalEvent": ["./extensions/MKFramework/assets/MKFramework/Config/GlobalEvent.ts"]`
				)
				.replace(
					"./extensions/mk-framework/@types/mk-framework/",
					"./extensions/MKFramework/@types/MKFramework/"
				);

			fs.writeFileSync(`${rootDir}/tsconfig.json`, tsconfig, "utf-8");
			console.log("处理TS配置 Success");
		})();
	} catch (error) {
		console.error("处理TS配置 Error:", error);
	}
	// VSCode配置
	try {
		(() => {
			if (!fs.existsSync(`${rootDir}/.vscode/settings.json`)) {
				return;
			}

			let settings = fs.readFileSync(
				`${rootDir}/.vscode/settings.json`,
				"utf-8"
			);

			settings = settings.replace(
				"./extensions/MKFramework/assets/mk-framework/framework/**",
				"./extensions/MKFramework/assets/MKFramework/Framework/**"
			);

			fs.writeFileSync(`${rootDir}/.vscode/settings.json`, settings, "utf-8");
			console.log("处理VSCode配置 Success");
		})();
	} catch (error) {
		console.error("处理VSCode配置 Error:", error);
	}
	// ...package.json

	// assets替换
	try {
		(() => {
			let prototype = fs.readJSONSync("./prototype.json") as Record<
				string,
				string
			>[];
			let global = fs.readJSONSync("./global.json") as Record<string, string>;
			let tsFiles = glob.globSync(`${rootDir}/assets/**/*.ts`);
			let prefabFiles = glob.globSync(`${rootDir}/assets/**/*.prefab`);
			let sceneFiles = glob.globSync(`${rootDir}/assets/**/*.scene`);

			// 替换接口
			tsFiles.forEach((vStr) => {
				let file = fs.readFileSync(vStr, "utf-8");

				// 替换导入
				for (let k2Str in prototype[0]) {
					file = file.replace(
						new RegExp(`import ${k2Str} from "${k2Str}"`, "g"),
						`import ${prototype[0][k2Str]} from "${prototype[0][k2Str]}"`
					);
				}
				// 替换接口
				for (let k2Num = prototype.length; --k2Num; ) {
					for (let k3Str in prototype[k2Num]) {
						file = file.replaceAll(k3Str, prototype[k2Num][k3Str]);
					}
				}

				// 替换全局属性
				for (let k2Str in global) {
					file = file
						.replaceAll(`.${k2Str}`, `.${global[k2Str]}`)
						.replace(new RegExp(`(?<=\\s)${k2Str}:`, "g"), `${global[k2Str]}:`)
						.replace(
							new RegExp(`(?<=\\s)${k2Str} =`, "g"),
							`${global[k2Str]} =`
						)
						.replace(
							new RegExp(`(?<=\\s)${k2Str}\\.`, "g"),
							`${global[k2Str]}\.`
						)
						.replace(
							new RegExp(`(?<=(\\(|\\s))${k2Str}(?=\\W)`, "g"),
							`${global[k2Str]}`
						);
				}
				fs.writeFileSync(vStr, file, "utf-8");
			});

			// 替换场景/prefab
			prefabFiles.forEach((vStr) => {
				let file = fs.readFileSync(vStr, "utf-8");

				// 替换接口
				[
					["mk_audio_base/unit", "MKAudioBase/Unit"],
					["mk_audio_common/unit", "MKAudioCommon/Unit"],
					["mk_audio_wx/unit", "MKAudioWX/Unit"],
					["mk_guide_step_base", "MkGuideStepBase"],
					["mk_language_node/node", "MKLanguageNode/Node"],
					["mk_view_base/animation_config", "MKViewBase/AnimationConfig"],
				].forEach((v2StrList) => {
					file = file.replaceAll(v2StrList[0], v2StrList[1]);
				});

				fs.writeFileSync(vStr, file, "utf-8");
			});
			console.log("处理assets替换 Success");
		})();
	} catch (error) {
		console.error("处理assets替换 Error:", error);
	}
})();
