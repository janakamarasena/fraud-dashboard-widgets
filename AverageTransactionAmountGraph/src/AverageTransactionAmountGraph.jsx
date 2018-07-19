import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './AverageTransactionAmountGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';

class AverageTransactionAmountGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            dataProviderConf: null,
            metadata: null,
            tableConfig:null,
            width: this.props.glContainer.width,
            height: this.props.glContainer.height
        }
        ;
        this._handleDataReceived = this._handleDataReceived.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.props.glContainer.on('resize', this.handleResize);
    }

    componentDidMount() {
      //  super.subscribe(this.setReceivedMsg);
        super.getWidgetConfiguration(this.props.widgetID)
            .then((message) => {
                this.setState({
                    dataProviderConf :  message.data.configs.providerConfig
                });
                this.handleChange(null,0);
               // super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, message.data.configs.providerConfig);
            })
            .catch((error) => {
                console.log("error", error);
            });

    }
    _handleDataReceived(data) {
        console.log(data);
        this.setState({gData:data.data});
    }

    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    handleChange (event, value){
       // this.setState({ tValue:value });
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        let aTableConfig = {
            x: "month",
            charts: [
                {
                    type: "line",
                    y: "amount(£)",
                    color: "tra",
                    colorScale:["#00FF85","#0085FF"],
                    style:{strokeWidth:2,markRadius:5}
                }
            ],
            maxLength: 7,
            legend: true
        };

        let aMetadata = {
            names: [
                "month",
                "amount(£)",
                "tra"
            ],
            types: [
                "ordinal",
                "linear",
                "ordinal"
            ]
        };
        this.setState({ tableConfig:aTableConfig,
            metadata:aMetadata});
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);
    };

    render() {
        return (
            <div className="div-style-atag">
                <br/>
                <VizG
                    config={this.state.tableConfig}
                    metadata={this.state.metadata}
                    data={this.state.gData}
                    height={this.props.glContainer.height - 75}
                    width={this.props.glContainer.width + 100}
                />
            </div>
        );
    }

}

global.dashboard.registerWidget('AverageTransactionAmountGraph', AverageTransactionAmountGraph);

//TODO:: complex equals
//TODO:: dynamic query
//TODO:: legend square
//TODO:: show loading when query changes
