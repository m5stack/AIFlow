export const DEFAULT_PROJECT_CODE = `import os, sys, io
import M5
from M5 import *

def setup():
  M5.begin()
  Widgets.setRotation(0)
  Widgets.fillScreen(0x000000)

def loop():
  M5.update()

if __name__ == '__main__':
  try:
    setup()
    while True:
      loop()
  except (Exception, KeyboardInterrupt) as e:
    try:
      from utility import print_error_msg
      print_error_msg(e)
    except ImportError:
      print("please update to latest firmware")
`
