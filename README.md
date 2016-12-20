# Barrel

## What is Barrel?
Barrel is a web-based application that permits ediiting and analysing fault-aware management protocols in composite applications specified in [TOSCA](http://docs.oasis-open.org/tosca/TOSCA/v1.0/TOSCA-v1.0.html).

## How to use Barrel
### Setting the stage
The very first step is to import a [CSAR](http://docs.oasis-open.org/tosca/TOSCA/v1.0/os/TOSCA-v1.0-os.html#_Toc356403711) package containing the TOSCA application to be edited and/or analysed. Once a CSAR is loaded, the corresponding application can be visualised, edited, and analysed through the corresponding *Visualise*, *Edit*, and *Analyse* panes

Sample CSARs concerning the application in the below figure are available in this repository.

![Thinking application](https://raw.githubusercontent.com/di-unipi-socc/barrel/master/examples/thinking-app.png)

They can be found in the [examples](https://github.com/di-unipi-socc/barrel/tree/master/examples) folder:
* [thinking-app-without-protocols.csar](https://github.com/di-unipi-socc/barrel/raw/master/examples/thinking-app-without-protocols.csar) is the CSAR modelling the application, without specifying any management protocol.
* [thinking-app.csar](https://github.com/di-unipi-socc/barrel/raw/master/examples/thinking-app.csar) is the CSAR modelling the application, by also specifying examples of fault-aware management protocols for its components (without specifying any fault-handling transition).
* [thinking-app-with-fault-handlers.csar](https://github.com/di-unipi-socc/barrel/raw/master/examples/thinking-app-with-fault-handlers.csar) is the CSAR modelling the application, by also specifying examples of fault-aware management protocols for its components (including fault-handling transition).

### Visualising applications

### Editing applications

### Analysing applications

## About
This repository contains the source code of the implementation of modelling and analysis approaches presented in 
> _A. Brogi, A. Canciani, J. Soldani <br>
> **Fault-aware management protocols for composite applications** <br>
> Submitted for publication._ 

If you wish to reuse the sources in this repository, please properly cite the above mentioned paper. Below you can find the BibTex reference:
```
@article{fault-aware-management-protocols,
  author = {Antonio Brogi and Andrea Canciani and Jacopo Soldani},
  title = {Fault-aware management protocols for composite applications},
  note = {[Submitted for publication]}
}
```
