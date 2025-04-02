"use client";
import { useState } from "react";
import Image from "next/image";
//import ObsidianGraph from "./graph";
import DummyGraph from "./dummgraph";
interface LandingProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
}

const Landing: React.FC<LandingProps> = ({ setGithubUrl }) => {
  const [value, setValue] = useState<string>("");
  return (
    <div className="h-screen w-screen bg-black absolute">
      <Image
        src="/bg.svg"
        alt="Landing Image"
        fill
        className="object-cover object-center opacity-65"
      />
      <div className="h-full flex flex-col justify-between">
        <div className="w-full pt-18 flex flex-col items-center space-x-4 absolute">
          <div className="h-24 text-center justify-start text-[#CE8F6F] text-7xl font-medium font-['Orbitron']">
            GitHub Repo Link
          </div>
          <div className="flex justify-center items-center space-x-24 z-20">
            <div className="relative w-[500px] flex scale-[1.4] py-4">
              <div className="w-full h-12 relative rounded-[10px]">
                <div className="w-[500] flex flex-row items-center justify-center h-12 left-0 top-0 absolute bg-zinc-800 rounded-[10px] shadow-[0px_4px_4px_0px_rgba(217,119,87,0.70)] shadow-[0px_4px_4px_0px_rgba(217,119,87,0.70)]" />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter GitHub Repo URL"
                  className="absolute flex items-center justify-center inset-0 text-[15px] rounded-lg pl-18 w-[440px] focus:outline-none"
                />
              </div>
            </div>
          </div>
          <Image
            src="/enter.png"
            alt="Button Image"
            width={100}
            height={50}
            className="w-[200px] h-[100px] ml-4 cursor-pointer scale-[1.4] my-4 z-30"
            onClick={() => {
              setGithubUrl(value);
              setValue("");
            }}
          />
        </div>
        <div className="absolute h-screen w-screen flex justify-center items-center scale-[0.7] pt-96">
          <DummyGraph />
        </div>
      </div>
    </div>
  );
};
export default Landing;
