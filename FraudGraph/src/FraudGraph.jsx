import React, { Component } from 'react';
import Widget from '@wso2-dashboards/widget';
import './FraudGraph.css';
import VizG from 'react-vizgrammar';
import _ from 'lodash';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import {MuiThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import JssProvider from 'react-jss/lib/JssProvider';

const darkTheme = createMuiTheme({
    palette: {
        type: "dark"
    }
});

const lightTheme = createMuiTheme({
    palette: {
        type: "light"
    }
});

class FraudGraph extends Widget {
    constructor(props) {
        super(props);
        this.state = {
            gData: [],
            tValue: 0,
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
        //console.log(data);
        this.setState({gData:data.data});
    }

    handleResize() {
        this.setState({width: this.props.glContainer.width, height: this.props.glContainer.height});
    }

    handleChange (event, value){
       // this.setState({ tValue:value });
        let providerConfig = _.cloneDeep(this.state.dataProviderConf);
        if (value === 0) {
            providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace("{{query1}}", "round(sum(amount), 2)  as amount");
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
                metadata:aMetadata,
                tValue:value});
        }else {
            providerConfig.configs.config.queryData.query = providerConfig.configs.config.queryData.query.replace("{{query1}}", "count(*) as count");

            let aTableConfig = {
                x: "month",
                charts: [
                    {
                        type: "line",
                        y: "count",
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
                    "count",
                    "tra"
                ],
                types: [
                    "ordinal",
                    "linear",
                    "ordinal"
                ]
            };
            this.setState({ tableConfig:aTableConfig,
                metadata:aMetadata,
                tValue:value});
        }
        super.getWidgetChannelManager().subscribeWidget(this.props.widgetID, this._handleDataReceived, providerConfig);
    };

    render() {
        return (
            <div>
                <div className="tab-margins">
                <JssProvider generateClassName={generateClassName}>
                <MuiThemeProvider theme={this.props.muiTheme.name === 'dark' ? darkTheme : lightTheme}>
                <Tabs

                    value={this.state.tValue}
                    indicatorColor="primary"
                    textColor="primary"
                    onChange={this.handleChange}
                    centered
                >
                    <Tab label="AMOUNT" />
                    <Tab label="COUNT"  />
                    {/*<Tab label="RATE" />*/}
                </Tabs>
                </MuiThemeProvider>
                </JssProvider>
                </div>
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


//This is the workaround suggested in https://github.com/marmelab/react-admin/issues/1782
const escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
let classCounter = 0;

export const generateClassName = (rule, styleSheet) => {
    classCounter += 1;

    if (process.env.NODE_ENV === 'production') {
        return `c${classCounter}`;
    }

    if (styleSheet && styleSheet.options.classNamePrefix) {
        let prefix = styleSheet.options.classNamePrefix;
        // Sanitize the string as will be used to prefix the generated class name.
        prefix = prefix.replace(escapeRegex, '-');

        if (prefix.match(/^Mui/)) {
            return `${prefix}-${rule.key}`;
        }

        return `${prefix}-${rule.key}-${classCounter}`;
    }

    return `${rule.key}-${classCounter}`;
};
global.dashboard.registerWidget('FraudGraph', FraudGraph);

//TODO:: complex equals
//TODO:: dynamic query
//TODO:: legend square
//TODO:: show loading when query changes
