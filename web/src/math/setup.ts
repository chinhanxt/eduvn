// web/src/math/setup.ts
import "mathlive";
import "mathlive/fonts.css";
import "mathlive/static.css";
import { MathfieldElement } from "mathlive";
import "./math.css";

MathfieldElement.fontsDirectory = null; // font đã nạp qua fonts.css (Vite đóng gói)
MathfieldElement.soundsDirectory = null;
MathfieldElement.decimalSeparator = ",";
