/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  ControlActionHandler,
  TPointerEvent,
  TransformActionHandler,
} from '../EventTypeDefs';
import { Intersection } from '../Intersection';
import { Point } from '../Point';
import { SCALE } from '../constants';
import type {
  InteractiveFabricObject,
  TOCoord,
} from '../shapes/Object/InteractiveObject';
import type { TCornerPoint, TDegree, TMat2D } from '../typedefs';
import {
  createRotateMatrix,
  createScaleMatrix,
  createTranslateMatrix,
  multiplyTransformMatrixArray,
} from '../util/misc/matrix';
import type { ControlRenderingStyleOverride } from './controlRendering';
import { renderCircleControl, renderSquareControl } from './controlRendering';

export class Control {
  /**
   * keep track of control visibility.
   * mainly for backward compatibility.
   * if you do not want to see a control, you can remove it
   * from the control set.
   * @type {Boolean}
   * @default true
   */
  visible = true;

  /**
   * Name of the action that the control will likely execute.
   * This is optional. FabricJS uses to identify what the user is doing for some
   * extra optimizations. If you are writing a custom control and you want to know
   * somewhere else in the code what is going on, you can use this string here.
   * you can also provide a custom getActionName if your control run multiple actions
   * depending on some external state.
   * default to scale since is the most common, used on 4 corners by default
   * @type {String}
   * @default 'scale'
   */
  actionName = SCALE;

  /**
   * Drawing angle of the control.
   * NOT used for now, but name marked as needed for internal logic
   * example: to reuse the same drawing function for different rotated controls
   * @type {Number}
   * @default 0
   */
  angle = 0;

  /**
   * Relative position of the control. X
   * 0,0 is the center of the Object, while -0.5 (left) or 0.5 (right) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  x = 0;

  /**
   * Relative position of the control. Y
   * 0,0 is the center of the Object, while -0.5 (top) or 0.5 (bottom) are the extremities
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  y = 0;

  /**
   * Horizontal offset of the control from the defined position. In pixels
   * Positive offset moves the control to the right, negative to the left.
   * It used when you want to have position of control that does not scale with
   * the bounding box. Example: rotation control is placed at x:0, y: 0.5 on
   * the boundind box, with an offset of 30 pixels vertically. Those 30 pixels will
   * stay 30 pixels no matter how the object is big. Another example is having 2
   * controls in the corner, that stay in the same position when the object scale.
   * of the bounding box.
   * @type {Number}
   * @default 0
   */
  offsetX = 0;

  /**
   * Vertical offset of the control from the defined position. In pixels
   * Positive offset moves the control to the bottom, negative to the top.
   * @type {Number}
   * @default 0
   */
  offsetY = 0;

  /**
   * Sets the length of the control. If null, defaults to object's cornerSize.
   * Expects both sizeX and sizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  sizeX = 0;

  /**
   * Sets the height of the control. If null, defaults to object's cornerSize.
   * Expects both sizeX and sizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  sizeY = 0;

  /**
   * Sets the length of the touch area of the control. If null, defaults to object's touchCornerSize.
   * Expects both touchSizeX and touchSizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  touchSizeX = 0;

  /**
   * Sets the height of the touch area of the control. If null, defaults to object's touchCornerSize.
   * Expects both touchSizeX and touchSizeY to be set when set.
   * @type {?Number}
   * @default null
   */
  touchSizeY = 0;

  /**
   * Css cursor style to display when the control is hovered.
   * if the method `cursorStyleHandler` is provided, this property is ignored.
   * @type {String}
   * @default 'crosshair'
   */
  cursorStyle = 'crosshair';

  /**
   * If controls has an offsetY or offsetX, draw a line that connects
   * the control to the bounding box
   * @type {Boolean}
   * @default false
   */
  withConnection = false;

  constructor(options?: Partial<Control>) {
    Object.assign(this, options);
  }

  /**
   * The control actionHandler, provide one to handle action ( control being moved )
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @return {Boolean} true if the action/event modified the object
   */
  declare actionHandler: TransformActionHandler;

  /**
   * The control handler for mouse down, provide one to handle mouse down on control
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @return {Boolean} true if the action/event modified the object
   */
  declare mouseDownHandler?: ControlActionHandler;

  /**
   * The control mouseUpHandler, provide one to handle an effect on mouse up.
   * @param {Event} eventData the native mouse event
   * @param {Transform} transformData properties of the current transform
   * @param {Number} x x position of the cursor
   * @param {Number} y y position of the cursor
   * @return {Boolean} true if the action/event modified the object
   */
  declare mouseUpHandler?: ControlActionHandler;

  shouldActivate(
    controlKey: string,
    fabricObject: InteractiveFabricObject,
    pointer: Point,
    { tl, tr, br, bl }: TCornerPoint,
  ) {
    // TODO: locking logic can be handled here instead of in the control handler logic
    return (
      fabricObject.canvas?.getActiveObject() === fabricObject &&
      fabricObject.isControlVisible(controlKey) &&
      Intersection.isPointInPolygon(pointer, [tl, tr, br, bl])
    );
  }

  /**
   * Returns control actionHandler
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @return {Function} the action handler
   */
  getActionHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): TransformActionHandler | undefined {
    return this.actionHandler;
  }

  /**
   * Returns control mouseDown handler
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @return {Function} the action handler
   */
  getMouseDownHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): ControlActionHandler | undefined {
    return this.mouseDownHandler;
  }

  /**
   * Returns control mouseUp handler.
   * During actions the fabricObject or the control can be of different obj
   * @param {Event} eventData the native mouse event
   * @param {FabricObject} fabricObject on which the control is displayed
   * @param {Control} control control for which the action handler is being asked
   * @return {Function} the action handler
   */
  getMouseUpHandler(
    eventData: TPointerEvent,
    fabricObject: InteractiveFabricObject,
    control: Control,
  ): ControlActionHandler | undefined {
    return this.mouseUpHandler;
  }

  /**
   * Returns control cursorStyle for css using cursorStyle. If you need a more elaborate
   * function you can pass one in the constructor
   * the cursorStyle property
   * @param {Event} eventData the native mouse event
   * @param {Control} control the current control ( likely this)
   * @param {FabricObject} object on which the control is displayed
   * @return {String}
   */
  cursorStyleHandler(
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
    coord: TOCoord,
  ) {
    return control.cursorStyle;
  }

  /**
   * Returns the action name. The basic implementation just return the actionName property.
   * @param {Event} eventData the native mouse event
   * @param {Control} control the current control ( likely this)
   * @param {FabricObject} object on which the control is displayed
   * @return {String}
   */
  getActionName(
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
  ) {
    return control.actionName;
  }

  /**
   * Returns controls visibility
   * @param {FabricObject} object on which the control is displayed
   * @param {String} controlKey key where the control is memorized on the
   * @return {Boolean}
   */
  getVisibility(fabricObject: InteractiveFabricObject, controlKey: string) {
    return fabricObject._controlsVisibility?.[controlKey] ?? this.visible;
  }

  /**
   * Sets controls visibility
   * @param {Boolean} visibility for the object
   * @return {Void}
   */
  setVisibility(
    visibility: boolean,
    name?: string,
    fabricObject?: InteractiveFabricObject,
  ) {
    this.visible = visibility;
  }

  positionHandler(
    dim: Point,
    finalMatrix: TMat2D,
    fabricObject: InteractiveFabricObject,
    currentControl: Control,
  ) {
    return new Point(
      this.x * dim.x + this.offsetX,
      this.y * dim.y + this.offsetY,
    ).transform(finalMatrix);
  }

  /**
   * Returns the coords for this control based on object values.
   * @param {Number} objectAngle angle from the fabric object holding the control
   * @param {Number} objectCornerSize cornerSize from the fabric object holding the control (or touchCornerSize if
   *   isTouch is true)
   * @param {Number} centerX x coordinate where the control center should be
   * @param {Number} centerY y coordinate where the control center should be
   * @param {boolean} isTouch true if touch corner, false if normal corner
   */
  calcCornerCoords(
    angle: TDegree,
    objectCornerSize: number,
    centerX: number,
    centerY: number,
    isTouch: boolean,
    fabricObject: InteractiveFabricObject,
  ) {
    const t = multiplyTransformMatrixArray([
      createTranslateMatrix(centerX, centerY),
      createRotateMatrix({ angle }),
      createScaleMatrix(
        (isTouch ? this.touchSizeX : this.sizeX) || objectCornerSize,
        (isTouch ? this.touchSizeY : this.sizeY) || objectCornerSize,
      ),
    ]);
    return {
      tl: new Point(-0.5, -0.5).transform(t),
      tr: new Point(0.5, -0.5).transform(t),
      br: new Point(0.5, 0.5).transform(t),
      bl: new Point(-0.5, 0.5).transform(t),
    };
  }

  /**
   * Render function for the control.
   * When this function runs the context is unscaled. unrotate. Just retina scaled.
   * all the functions will have to translate to the point left,top before starting Drawing
   * if they want to draw a control where the position is detected.
   * left and top are the result of the positionHandler function
   * @param {RenderingContext2D} ctx the context where the control will be drawn
   * @param {Number} left position of the canvas where we are about to render the control.
   * @param {Number} top position of the canvas where we are about to render the control.
   * @param {Object} styleOverride
   * @param {FabricObject} fabricObject the object where the control is about to be rendered
   */
  render(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: ControlRenderingStyleOverride | undefined,
    fabricObject: InteractiveFabricObject,
  ) {
    styleOverride = styleOverride || {};
    switch (styleOverride.cornerStyle || fabricObject.cornerStyle) {
      case 'circle':
        renderCircleControl.call(
          this,
          ctx,
          left,
          top,
          styleOverride,
          fabricObject,
        );
        break;
      default:
        renderSquareControl.call(
          this,
          ctx,
          left,
          top,
          styleOverride,
          fabricObject,
        );
    }
  }
}
