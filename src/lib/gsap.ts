import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DrawSVGPlugin from "gsap/DrawSVGPlugin";
import MorphSVGPlugin from "gsap/MorphSVGPlugin";
import MotionPathPlugin from "gsap/MotionPathPlugin";
import CustomEase from "gsap/CustomEase";
import ScrollToPlugin from "gsap/ScrollToPlugin";

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
  ScrollToPlugin,
);

CustomEase.create("studioEase", "M0,0 C0.16,1 0.3,1 1,1");
CustomEase.create("studioWhip", "M0,0 C0.85,0 0.15,1 1,1");

export {
  gsap,
  useGSAP,
  ScrollTrigger,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
  ScrollToPlugin,
};
