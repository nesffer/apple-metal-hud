#!/usr/bin/env node

import { Command } from "commander";
import { execSync } from "child_process";
import * as process from "process";
import * as readline from "readline";

interface DeviceInfo {
  identifier: string;
  name?: string;
  platform?: string;
  connectionType?: string;
}

interface ApplicationInfo {
  bundleId: string;
  displayName?: string;
  pid?: string;
  fullPath?: string;
}

class DeviceManager {
  /**
   * xcrun devicectl list devices 명령어를 실행하고 결과를 파싱합니다.
   */
  async getDevices(): Promise<DeviceInfo[]> {
    try {
      console.log("🔍 디바이스 목록을 가져오는 중...");

      // xcrun devicectl list devices 명령어 실행
      const output = execSync("xcrun devicectl list devices", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      return this.parseDeviceOutput(output);
    } catch (error: any) {
      console.error("❌ 디바이스 목록을 가져오는데 실패했습니다:");
      console.error(error.message);

      if (
        error.message.includes("command not found") ||
        error.message.includes("xcrun")
      ) {
        console.error(
          "💡 Xcode Command Line Tools가 설치되어 있는지 확인해주세요."
        );
        console.error("   설치 명령어: xcode-select --install");
      }

      throw error;
    }
  }

  /**
   * 선택된 디바이스에서 실행 중인 애플리케이션 목록을 가져옵니다.
   */
  async getApplications(deviceIdentifier: string): Promise<ApplicationInfo[]> {
    try {
      console.log("📱 애플리케이션 목록을 가져오는 중...");

      // xcrun devicectl device info processes 명령어 실행
      const output = execSync(
        `xcrun devicectl device info processes --device ${deviceIdentifier} | grep 'Bundle/Application'`,
        {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      return this.parseApplicationOutput(output);
    } catch (error: any) {
      console.error("❌ 애플리케이션 목록을 가져오는데 실패했습니다:");
      console.error(error.message);

      if (error.message.includes("No matching processes")) {
        console.log("📱 실행 중인 애플리케이션이 없습니다.");
        return [];
      }

      throw error;
    }
  }

  /**
   * 애플리케이션 프로세스 출력을 파싱합니다.
   */
  private parseApplicationOutput(output: string): ApplicationInfo[] {
    const applications: ApplicationInfo[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Bundle/Application 패턴을 찾아서 앱 이름과 번들 ID 추출
      const bundleMatch = trimmedLine.match(
        /Bundle\/Application\/([^\/]+)\/([^\/]+\.app)/
      );
      if (bundleMatch) {
        const bundleId = bundleMatch[1];
        const appName = bundleMatch[2]; // XXX.app 형태

        // 전체 경로 추출 (Bundle/Application/... 부분)
        const pathMatch = trimmedLine.match(
          /(\/private\/var\/containers\/Bundle\/Application\/[^\/]+\/[^\/]+\.app)/
        );
        const fullPath = pathMatch ? pathMatch[1] : undefined;

        // PID 추출 (보통 라인의 시작 부분에 있음)
        const pidMatch = trimmedLine.match(/^\s*(\d+)/);
        const pid = pidMatch ? pidMatch[1] : undefined;

        // 중복 제거 (같은 앱의 여러 프로세스가 있을 수 있음)
        if (!applications.find((app) => app.bundleId === bundleId)) {
          applications.push({
            bundleId: bundleId,
            displayName: appName,
            pid: pid,
            fullPath: fullPath,
          });
        }
      }
    }

    return applications;
  }

  /**
   * 애플리케이션 목록을 출력합니다.
   */
  displayApplications(applications: ApplicationInfo[]): void {
    if (applications.length === 0) {
      console.log("📱 실행 중인 애플리케이션이 없습니다.");
      return;
    }

    console.log(`\n📱 실행 중인 애플리케이션: ${applications.length}개\n`);

    applications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.displayName || app.bundleId}`);
      console.log(`   📦 Bundle ID: ${app.bundleId}`);
      if (app.pid) {
        console.log(`   🆔 PID: ${app.pid}`);
      }
      console.log("");
    });
  }

  /**
   * 사용자에게 애플리케이션 선택을 요청하고 선택된 애플리케이션 정보를 반환합니다.
   */
  async selectApplication(
    applications: ApplicationInfo[]
  ): Promise<ApplicationInfo> {
    if (applications.length === 0) {
      throw new Error("선택할 수 있는 애플리케이션이 없습니다.");
    }

    if (applications.length === 1) {
      console.log(`\n🎯 애플리케이션이 1개만 있어서 자동으로 선택됩니다:`);
      console.log(
        `   ${applications[0].displayName || applications[0].bundleId} (${
          applications[0].bundleId
        })\n`
      );
      return applications[0];
    }

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log("\n📱 실행 중인 애플리케이션 목록:\n");
      applications.forEach((app, index) => {
        console.log(`${index + 1}. ${app.displayName || app.bundleId}`);
        console.log(`   📦 Bundle ID: ${app.bundleId}`);
        if (app.pid) {
          console.log(`   🆔 PID: ${app.pid}`);
        }
        console.log("");
      });

      rl.question(
        `애플리케이션을 선택하세요 (1-${applications.length}): `,
        (answer) => {
          rl.close();

          const selection = parseInt(answer.trim());

          if (
            isNaN(selection) ||
            selection < 1 ||
            selection > applications.length
          ) {
            reject(
              new Error(
                `잘못된 선택입니다. 1부터 ${applications.length} 사이의 숫자를 입력해주세요.`
              )
            );
            return;
          }

          const selectedApp = applications[selection - 1];
          console.log(
            `\n✅ 선택된 애플리케이션: ${
              selectedApp.displayName || selectedApp.bundleId
            }`
          );
          console.log(`📦 Bundle ID: ${selectedApp.bundleId}\n`);

          resolve(selectedApp);
        }
      );
    });
  }

  /**
   * Metal HUD를 활성화하여 애플리케이션을 실행합니다.
   */
  async launchAppWithMetalHUD(
    deviceIdentifier: string,
    app: ApplicationInfo
  ): Promise<void> {
    if (!app.fullPath) {
      throw new Error("애플리케이션의 전체 경로를 찾을 수 없습니다.");
    }

    try {
      console.log("🚀 Metal HUD를 활성화하여 애플리케이션을 실행합니다...");
      console.log(`📱 디바이스: ${deviceIdentifier}`);
      console.log(`🎮 앱: ${app.displayName}`);
      console.log(`📂 경로: ${app.fullPath}`);
      console.log("");

      const command = `xcrun devicectl device process launch -e '{"MTL_HUD_ENABLED": "1"}' --console --device ${deviceIdentifier} "${app.fullPath}"`;

      console.log("🔧 실행 명령어:");
      console.log(command);
      console.log("");

      // 명령어 실행
      const output = execSync(command, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      console.log("✅ 애플리케이션이 성공적으로 실행되었습니다!");
      console.log(
        "📊 Metal HUD가 활성화되어 GPU 성능 정보를 확인할 수 있습니다."
      );

      if (output.trim()) {
        console.log("\n📋 실행 결과:");
        console.log(output);
      }
    } catch (error: any) {
      console.error("❌ 애플리케이션 실행에 실패했습니다:");
      console.error(error.message);

      if (error.message.includes("not found")) {
        console.error("💡 앱이 디바이스에 설치되어 있는지 확인해주세요.");
      } else if (error.message.includes("permission")) {
        console.error("💡 개발자 모드가 활성화되어 있는지 확인해주세요.");
      }

      throw error;
    }
  }

  /**
   * xcrun devicectl의 출력을 파싱하여 디바이스 정보를 추출합니다.
   */
  private parseDeviceOutput(output: string): DeviceInfo[] {
    const devices: DeviceInfo[] = [];
    const lines = output.split("\n");

    // 테이블 형식의 출력을 파싱합니다
    // 헤더 라인을 찾아서 컬럼 위치를 파악합니다
    let headerLineIndex = -1;
    let nameColStart = -1;
    let identifierColStart = -1;
    let stateColStart = -1;
    let modelColStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes("Name") &&
        line.includes("Identifier") &&
        line.includes("State") &&
        line.includes("Model")
      ) {
        headerLineIndex = i;
        nameColStart = line.indexOf("Name");
        identifierColStart = line.indexOf("Identifier");
        stateColStart = line.indexOf("State");
        modelColStart = line.indexOf("Model");
        break;
      }
    }

    if (headerLineIndex === -1) {
      // 테이블 형식이 아닌 경우 기존 파싱 방식 사용
      return this.parseDeviceOutputLegacy(output);
    }

    // 헤더 다음 라인부터 데이터 파싱
    for (let i = headerLineIndex + 2; i < lines.length; i++) {
      // +2는 헤더와 구분선을 건너뛰기 위함
      const line = lines[i];
      if (!line.trim()) continue; // 빈 라인 건너뛰기

      try {
        const name = line.substring(nameColStart, identifierColStart).trim();
        const identifier = line
          .substring(identifierColStart, stateColStart)
          .trim();
        const state = line.substring(stateColStart, modelColStart).trim();
        const model = line.substring(modelColStart).trim();

        if (identifier && identifier.length > 10) {
          // 유효한 identifier인지 확인
          devices.push({
            identifier: identifier,
            name: name || undefined,
            platform: this.extractPlatformFromModel(model),
            connectionType: state.includes("paired") ? "paired" : "available",
          });
        }
      } catch (error) {
        // 파싱 에러가 있는 라인은 건너뛰기
        continue;
      }
    }

    return devices;
  }

  /**
   * 모델명에서 플랫폼을 추출합니다.
   */
  private extractPlatformFromModel(model: string): string {
    if (model.includes("iPhone")) return "iOS";
    if (model.includes("iPad")) return "iPadOS";
    if (model.includes("Watch")) return "watchOS";
    if (model.includes("Apple TV")) return "tvOS";
    if (model.includes("Mac")) return "macOS";
    return "Unknown";
  }

  /**
   * 기존 파싱 방식 (레거시)
   */
  private parseDeviceOutputLegacy(output: string): DeviceInfo[] {
    const devices: DeviceInfo[] = [];
    const lines = output.split("\n");

    // Identifier 패턴을 찾기 위한 정규식
    const identifierRegex = /Identifier:\s*([A-F0-9-]+)/i;
    const nameRegex = /Name:\s*(.+)/i;
    const platformRegex = /Platform:\s*(.+)/i;
    const connectionRegex = /Connection Type:\s*(.+)/i;

    let currentDevice: Partial<DeviceInfo> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Identifier 찾기
      const identifierMatch = trimmedLine.match(identifierRegex);
      if (identifierMatch) {
        // 이전 디바이스가 있으면 배열에 추가
        if (currentDevice.identifier) {
          devices.push(currentDevice as DeviceInfo);
        }

        currentDevice = {
          identifier: identifierMatch[1],
        };
        continue;
      }

      // 현재 디바이스가 있을 때만 추가 정보 파싱
      if (currentDevice.identifier) {
        const nameMatch = trimmedLine.match(nameRegex);
        if (nameMatch) {
          currentDevice.name = nameMatch[1];
          continue;
        }

        const platformMatch = trimmedLine.match(platformRegex);
        if (platformMatch) {
          currentDevice.platform = platformMatch[1];
          continue;
        }

        const connectionMatch = trimmedLine.match(connectionRegex);
        if (connectionMatch) {
          currentDevice.connectionType = connectionMatch[1];
          continue;
        }
      }
    }

    // 마지막 디바이스 추가
    if (currentDevice.identifier) {
      devices.push(currentDevice as DeviceInfo);
    }

    return devices;
  }

  /**
   * 디바이스 목록을 출력합니다.
   */
  displayDevices(devices: DeviceInfo[]): void {
    if (devices.length === 0) {
      console.log("📱 연결된 디바이스가 없습니다.");
      return;
    }

    console.log(`\n📱 발견된 디바이스: ${devices.length}개\n`);

    devices.forEach((device, index) => {
      console.log(`${index + 1}. ${device.name || "알 수 없는 디바이스"}`);
      console.log(`   🆔 Identifier: ${device.identifier}`);
      if (device.platform) {
        console.log(`   🖥️  Platform: ${device.platform}`);
      }
      if (device.connectionType) {
        console.log(`   🔗 Connection: ${device.connectionType}`);
      }
      console.log("");
    });
  }

  /**
   * Identifier만 추출하여 배열로 반환합니다.
   */
  getIdentifiers(devices: DeviceInfo[]): string[] {
    return devices.map((device) => device.identifier);
  }

  /**
   * 사용자에게 디바이스 선택을 요청하고 선택된 디바이스의 Identifier를 반환합니다.
   */
  async selectDevice(devices: DeviceInfo[]): Promise<string> {
    if (devices.length === 0) {
      throw new Error("선택할 수 있는 디바이스가 없습니다.");
    }

    if (devices.length === 1) {
      console.log(`\n🎯 디바이스가 1개만 있어서 자동으로 선택됩니다:`);
      console.log(
        `   ${devices[0].name || "알 수 없는 디바이스"} (${
          devices[0].identifier
        })\n`
      );
      return devices[0].identifier;
    }

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log("\n📱 사용 가능한 디바이스 목록:\n");
      devices.forEach((device, index) => {
        console.log(`${index + 1}. ${device.name || "알 수 없는 디바이스"}`);
        console.log(`   🆔 Identifier: ${device.identifier}`);
        if (device.platform) {
          console.log(`   🖥️  Platform: ${device.platform}`);
        }
        console.log("");
      });

      rl.question(`디바이스를 선택하세요 (1-${devices.length}): `, (answer) => {
        rl.close();

        const selection = parseInt(answer.trim());

        if (isNaN(selection) || selection < 1 || selection > devices.length) {
          reject(
            new Error(
              `잘못된 선택입니다. 1부터 ${devices.length} 사이의 숫자를 입력해주세요.`
            )
          );
          return;
        }

        const selectedDevice = devices[selection - 1];
        console.log(
          `\n✅ 선택된 디바이스: ${
            selectedDevice.name || "알 수 없는 디바이스"
          }`
        );
        console.log(`🆔 Identifier: ${selectedDevice.identifier}\n`);

        resolve(selectedDevice.identifier);
      });
    });
  }
}

async function main() {
  const program = new Command();
  const deviceManager = new DeviceManager();

  program
    .name("apple-metal-hud")
    .description(
      "Apple 디바이스에서 Metal HUD를 활성화하여 앱을 실행하는 CLI 도구"
    )
    .version("1.0.0")
    .option("--no-launch", "앱을 실행하지 않고 명령어만 표시합니다")
    .option("--list", "연결된 디바이스 목록만 표시합니다")
    .action(async (options: { launch?: boolean; list?: boolean }) => {
      try {
        const devices = await deviceManager.getDevices();

        if (devices.length === 0) {
          console.log("📱 연결된 디바이스가 없습니다.");
          return;
        }

        // --list 옵션이 있으면 디바이스 목록만 표시
        if (options.list) {
          deviceManager.displayDevices(devices);
          return;
        }

        // 1단계: 디바이스 선택
        const selectedIdentifier = await deviceManager.selectDevice(devices);

        console.log("💾 선택된 디바이스의 Identifier:");
        console.log(`${selectedIdentifier}`);

        // 2단계: 애플리케이션 선택
        const applications = await deviceManager.getApplications(
          selectedIdentifier
        );

        if (applications.length === 0) {
          console.log("📱 실행 중인 애플리케이션이 없습니다.");
          console.log("💡 앱을 먼저 실행한 후 다시 시도해주세요.");
          return;
        }

        const selectedApp = await deviceManager.selectApplication(applications);

        console.log("💾 선택된 애플리케이션 정보:");
        console.log(`📦 Bundle ID: ${selectedApp.bundleId}`);
        console.log(`📂 경로: ${selectedApp.fullPath}`);

        // 3단계: Metal HUD로 앱 실행
        if (options.launch !== false) {
          // 기본적으로 바로 실행
          await deviceManager.launchAppWithMetalHUD(
            selectedIdentifier,
            selectedApp
          );
        } else {
          console.log(`\n🔧 Metal HUD 실행 명령어:`);
          console.log(
            `xcrun devicectl device process launch -e '{"MTL_HUD_ENABLED": "1"}' --console --device ${selectedIdentifier} "${selectedApp.fullPath}"`
          );
        }
      } catch (error: any) {
        console.error("❌ 오류:", error.message);
        process.exit(1);
      }
    });

  program.parse();
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}
