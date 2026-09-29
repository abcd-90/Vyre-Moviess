class MovieboxTui < Formula
  VERSION = "0.1.24"
  MACOS_SHA256 = "4354497c76ac8cead45abeac9f8503dcdb7195c6757caa4b7ee20b1732955362"
  LINUX_X64_SHA256 = "6c512c4c618292c11d4566292568740ec777067f5d401e345b703003f695bc34"
  LINUX_ARM64_SHA256 = "cedf5281715808ac2dd25e28ef5160c5412bd7ed6bc9d467a3b628ba6fe42174"

  desc "Stream movies, shows, anime, and live TV from your terminal"
  homepage "https://github.com/mesamirh/MovieBox-Tui"
  version VERSION
  license any_of: ["MIT", "Apache-2.0"]

  on_macos do
    url "https://github.com/mesamirh/MovieBox-Tui/releases/download/v#{VERSION}/MovieBox_macOS_Universal.tar.gz"
    sha256 MACOS_SHA256
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/mesamirh/MovieBox-Tui/releases/download/v#{VERSION}/MovieBox_Linux_arm64.tar.gz"
      sha256 LINUX_ARM64_SHA256
    else
      url "https://github.com/mesamirh/MovieBox-Tui/releases/download/v#{VERSION}/MovieBox_Linux_x64.tar.gz"
      sha256 LINUX_X64_SHA256
    end
  end

  def install
    bin.install "moviebox-tui"
  end

  test do
    system "#{bin}/moviebox-tui", "--version"
  end
end
