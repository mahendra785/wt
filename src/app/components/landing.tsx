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
    <div className="h-screen w-screen bg-black">
      <div className="h-full flex flex-col justify-between">
        <div className="w-full flex justify-end">
          <Image
            src="/tr.png"
            alt="Landing Image"
            width={180}
            height={20}
            className="flex justify-end lg:w-[20vh] md:w-[18vh] sm:w-[17vh] w-[15vh]"
          />
        </div>
        <div className="w-full pt-18 flex flex-col items-center space-x-4 absolute">
          <div className="h-24 text-center justify-start text-cyan-300 text-7xl font-medium font-['Orbitron']">
            GitHub Repo Link
          </div>
          <div className="flex justify-center items-center space-x-24 z-20">
            <div className="relative w-[500px] flex scale-[1.4]">
              <div className="relative">
                <Image
                  src="/text.png"
                  alt="Button Image"
                  width={500}
                  height={50}
                  className="w-[500px]"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter GitHub Repo URL"
                  className="absolute inset-0 text-lg rounded-lg pl-18 w-[440px] focus:outline-none"
                />
              </div>
            </div>
            <Image
              src="/enter.png"
              alt="Button Image"
              width={100}
              height={50}
              className="w-[200px] h-[100px] ml-4 cursor-pointer scale-[1.4]"
              onClick={() => {
                setGithubUrl(value);
                setValue("");
              }}
            />
          </div>
        </div>

        <div className="w-full flex justify-start">
          <Image
            src="/bl.png"
            alt="Landing Image"
            width={180}
            height={20}
            className="flex justify-start lg:w-[40vw] md:w-[50vw] sm:w-[60vw] w-[65vw]"
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
