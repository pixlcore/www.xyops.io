#!/bin/bash

cd htdocs/images/featureshots

# 568 × 1238 --> 852x1857
canvas-plus "workflow-edit.png" --filter "opacity/opacity:0" --filter "composite/image:select-condition.png/gravity:northeast/scale:1.5" --output "floater-select-condition.png"

canvas-plus "edit-trigger-weekly.png" --filter "opacity/opacity:0" --filter "composite/image:select-trigger-type.png/gravity:northwest" --output "floater-select-trigger-type.png"

canvas-plus "active-jobs-many-crop.png" --filter "opacity/opacity:0" --filter "composite/image:header-widgets.png/gravity:northwest" --output "floater-header-widgets.png"

canvas-plus "small-charts.png" --filter "opacity/opacity:0" --filter "composite/image:mem-details.png/gravity:northeast" --output "floater-mem-details.png"

canvas-plus "cpu-load-alert.png" --filter "opacity/opacity:0" --filter "composite/image:alert-edit-compact.png/gravity:northwest" --output "floater-alert-edit-compact.png"
canvas-plus "cpu-load-alert.png" --filter "opacity/opacity:0" --filter "composite/image:toast-warning-new-alert.png/gravity:southeast/scale:1.5" --output "floater-toast-warning-new-alert.png"

canvas-plus "ticket-attribs-3x3.png" --filter "opacity/opacity:0" --filter "composite/image:select-ticket-type.png/gravity:northeast" --output "floater-select-ticket-type.png"
canvas-plus "ticket-attribs-3x3.png" --filter "opacity/opacity:0" --filter "composite/image:select-ticket-tags.png/gravity:southwest" --output "floater-select-ticket-tags.png"

canvas-plus "plugin-script-editor-wider.png" --filter "opacity/opacity:0" --filter "composite/image:plugin-new-param-dialog.png/gravity:northwest/scale:0.7" --output "floater-plugin-new-param-dialog.png"

canvas-plus *.png --filter "write/format:webp/quality:80"

cd ../screenshots
canvas-plus *.png --filter "resize/width:75%" --filter "write/format:webp/quality:80"

